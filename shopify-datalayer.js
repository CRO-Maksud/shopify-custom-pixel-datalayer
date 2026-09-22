// =========================================================================
// 1. DATA LAYER & GTM INITIALIZATION
// =========================================================================

window.dataLayer = window.dataLayer || [];

// Push initial context data
if (init?.context) {
  window.dataLayer.push({
    event: "context_data",
    page_location: init.context.document?.location?.href,
    page_referrer: init.context.document?.referrer,
    page_title: init.context.document?.title,
    page_path: init.context.document?.location?.pathname,
    search_param: init.context.document?.location?.search,
    hash_param: init.context.document?.location?.hash,
    language: init.context.navigator?.language,
    screen_width: init.context.window?.outerWidth,
    screen_height: init.context.window?.outerHeight,
    user_agent: init.context.navigator?.userAgent
  });
}

// Safe GTM Script Loader for Shopify Pixels Sandbox
(function(w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var j = d.createElement(s), dl = l !== 'dataLayer' ? '&l=' + l : '';
  j.async = true;
  j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
  var f = d.getElementsByTagName(s)[0];
  if (f && f.parentNode) {
    f.parentNode.insertBefore(j, f);
  } else {
    (d.head || d.body || d.documentElement).appendChild(j);
  }
})(window, document, 'script', 'dataLayer', 'GTM-K3BWVM8');

// Enabled Tracking Platforms
const trackingPlatform = ["Facebook", "Pinterest", "Snapchat"];

// Event Deduping Flags
let page_view_fired = false;
let checkout_contact_info_submitted_fired = false;
let checkout_address_info_submitted_fired = false;
let checkout_shipping_info_submitted_fired = false;

// Push Customer Data
if (init?.data?.customer?.id) {
  const cust = init.data.customer;
  window.dataLayer.push({
    event: "loggedIn_userData",
    loggedInUser_id: cust.id,
    loggedInUser_email: cust.email,
    loggedInUser_phone: cust.phone,
    loggedInUser_firstName: cust.firstName,
    loggedInUser_lastName: cust.lastName,
    loggedInUser_ordersCount: cust.ordersCount
  });
} else {
  window.dataLayer.push({ event: "loggedIn_userData" });
}

// =========================================================================
// 2. HELPER FUNCTIONS
// =========================================================================

function getContextData() {
  const contextObj = window.dataLayer.find(item => item.event === "context_data");
  if (!contextObj) return {};
  const copy = JSON.parse(JSON.stringify(contextObj));
  delete copy.gtm?.uniqueEventId;
  delete copy.event;
  return copy;
}

function resetDataLayer() {
  window.dataLayer.push({
    ecommerce: null,
    pt_browser_side: null,
    snap_browser_side: null,
    fb_browser_side: null
  });
}

const isPlatformActive = (platform) => 
  trackingPlatform.some(p => p.toLowerCase().includes(platform.toLowerCase()));

function parseAddress(shippingAddr, billingAddr) {
  const addr = shippingAddr || billingAddr || {};
  return {
    customer_address_Line1: addr.address1 || "",
    customer_address_Line2: addr.address2 || "",
    customer_city: addr.city || "",
    customer_country: addr.country || "",
    customer_countryCode: addr.countryCode || "",
    customer_firstName: addr.firstName || "",
    customer_lastName: addr.lastName || "",
    customer_phoneNo: addr.phone || "",
    customer_state: addr.province || "",
    customer_stateCode: addr.provinceCode || "",
    customer_zip: addr.zip || ""
  };
}

function buildCheckoutPayload(eventData, customEventName) {
  const checkout = eventData?.data?.checkout;
  if (!checkout) return {};

  const lineItems = checkout.lineItems || [];
  const totalQty = lineItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

  const items = lineItems.map(item => ({
    item_id: item.variant?.product?.id,
    item_name: item.variant?.product?.title,
    item_brand: item.variant?.product?.vendor,
    item_category: item.variant?.product?.type,
    item_variant: item.variant?.title || "",
    price: item.variant?.price?.amount,
    coupon: item.discountAllocations?.[0]?.discountApplication?.title || "",
    quantity: item.quantity
  }));

  const lineItemsAlt = lineItems.map(item => ({
    product_id: item.variant?.product?.id,
    product_name: item.variant?.product?.title,
    product_variant_id: item.variant?.id,
    product_brand: item.variant?.product?.vendor || "",
    product_category: item.variant?.product?.type,
    product_price: item.variant?.price?.amount,
    product_quantity: item.quantity
  }));

  const productSkus = lineItems.map(item => item.variant?.sku || "");
  const productVariantIds = lineItems.map(item => item.variant?.id);
  const productIds = lineItems.map(item => item.variant?.product?.id);
  const productTypes = lineItems.map(item => item.variant?.product?.type || "").filter(Boolean).join(",");
  const productVendors = lineItems.map(item => item.variant?.product?.vendor || "").filter(Boolean);
  const productTitles = lineItems.map(item => item.variant?.product?.title).join(", ");
  
  const contents = lineItems.map(item => ({
    id: item.variant?.product?.id,
    quantity: item.quantity,
    item_price: item.variant?.price?.amount
  }));

  const addressData = parseAddress(checkout.shippingAddress, checkout.billingAddress);
  const couponCode = checkout.discountApplications?.[0]?.title || "";

  const ecommerce = {
    currency: checkout.currencyCode,
    value: checkout.totalPrice?.amount,
    coupon: couponCode,
    items: items
  };

  if (customEventName === "purchase") {
    ecommerce.tax = checkout.totalTax?.amount;
    ecommerce.shipping = checkout.shippingLine?.price?.amount || "";
    ecommerce.transaction_id = checkout.order?.id ? checkout.order.id.split("/").pop() : "";
  }

  const payload = {
    event: customEventName,
    client_id: eventData.clientId,
    event_time: eventData.timestamp,
    event_time_seconds: Math.round(new Date(eventData.timestamp) / 1000),
    event_source: "custom_pixel",
    product_variant_id: productVariantIds,
    product_sku: productSkus,
    itemTotalQuantity: totalQty,
    total_tax: checkout.totalTax?.amount,
    subTotal_price: checkout.subtotalPrice?.amount,
    shipping: checkout.shippingLine?.price?.amount || "",
    transaction_id: checkout.order?.id || "",
    email: checkout.email || "",
    phone: checkout.phone || "",
    ...addressData,
    ecommerce: ecommerce
  };

  if (customEventName === "purchase") {
    payload.payment_gateway = checkout.transactions?.[0]?.gateway || "";
    payload.customer_id = checkout.order?.customer?.id || "";
    payload.customer_type = checkout.order?.customer?.isFirstOrder === true ? "New" : "Existing";
  }

  if (isPlatformActive("facebook")) {
    payload.fb_browser_side = {
      content_ids: productIds,
      content_category: productTypes,
      content_name: productTitles,
      content_type: "product",
      contents: contents,
      currency: checkout.currencyCode,
      value: checkout.totalPrice?.amount,
      num_items: totalQty
    };
  }

  if (isPlatformActive("pinterest")) {
    payload.pt_browser_side = {
      value: checkout.totalPrice?.amount,
      order_quantity: totalQty,
      currency: checkout.currencyCode,
      line_items: lineItemsAlt
    };
    if (customEventName === "purchase") {
      payload.pt_browser_side.order_id = checkout.order?.id ? checkout.order.id.split("/").pop() : "";
      payload.pt_browser_side.promo_code = couponCode;
    }
  }

  if (isPlatformActive("snapchat")) {
    payload.snap_browser_side = {
      price: checkout.totalPrice?.amount,
      currency: checkout.currencyCode,
      item_ids: productIds,
      item_category: productTypes,
      brands: productVendors,
      number_items: totalQty,
      payment_info_available: 1
    };
    if (customEventName === "purchase") {
      payload.snap_browser_side.transaction_id = checkout.order?.id ? checkout.order.id.split("/").pop() : "";
    }
  }

  return payload;
}

// =========================================================================
// 3. ANALYTICS SUBSCRIPTIONS
// =========================================================================

// Page View
analytics.subscribe("page_viewed", event => {
  if (!page_view_fired) {
    const ctx = getContextData();
    window.dataLayer.push({
      event: "page_viewed",
      client_id: event.clientId,
      event_time: event.timestamp,
      event_time_seconds: Math.round(new Date(event.timestamp) / 1000),
      event_source: "custom_pixel",
      ...ctx
    });
    page_view_fired = true;
  }
});

// View Item
analytics.subscribe("product_viewed", event => {
  const ctx = getContextData();
  const variant = event.data?.productVariant;
  if (!variant) return;

  const payload = {
    event: "view_item",
    client_id: event.clientId,
    event_time: event.timestamp,
    event_time_seconds: Math.round(new Date(event.timestamp) / 1000),
    event_source: "custom_pixel",
    product_variant_id: [variant.id],
    product_sku: [variant.sku],
    ecommerce: {
      currency: variant.price.currencyCode,
      value: variant.price.amount,
      items: [{
        item_id: variant.product.id,
        item_name: variant.product.title,
        item_brand: variant.product.vendor,
        item_category: variant.product.type,
        item_variant: variant.title || "",
        price: variant.price.amount,
        quantity: 1
      }]
    }
  };

  if (isPlatformActive("pinterest")) {
    payload.pt_browser_side = {
      value: variant.price.amount,
      order_quantity: 1,
      currency: variant.price.currencyCode,
      line_items: [{
        product_name: variant.product.title,
        product_id: variant.product.id,
        product_variant_id: variant.id,
        product_category: variant.product.type,
        product_brand: variant.product.vendor || "",
        product_price: variant.price.amount,
        product_quantity: 1
      }]
    };
  }

  if (isPlatformActive("snapchat")) {
    payload.snap_browser_side = {
      price: variant.price.amount,
      currency: variant.price.currencyCode,
      item_ids: [variant.product.id],
      item_category: variant.product.type,
      brands: variant.product.vendor ? [variant.product.vendor] : []
    };
  }

  if (isPlatformActive("facebook")) {
    payload.fb_browser_side = {
      content_ids: [variant.product.id],
      content_category: variant.product.type,
      content_name: variant.product.title,
      content_type: "product",
      contents: [{ id: variant.product.id, quantity: 1, item_price: variant.price.amount }],
      currency: variant.price.currencyCode,
      value: variant.price.amount
    };
  }

  resetDataLayer();
  window.dataLayer.push({ ...payload, ...ctx });
});

// Add To Cart
analytics.subscribe("product_added_to_cart", event => {
  const ctx = getContextData();
  const cartLine = event.data?.cartLine;
  if (!cartLine) return;

  const payload = {
    event: "add_to_cart",
    client_id: event.clientId,
    event_time: event.timestamp,
    event_time_seconds: Math.round(new Date(event.timestamp) / 1000),
    event_source: "custom_pixel",
    product_variant_id: [cartLine.merchandise.id],
    product_sku: [cartLine.merchandise.sku],
    ecommerce: {
      currency: cartLine.cost.totalAmount.currencyCode,
      value: cartLine.cost.totalAmount.amount,
      items: [{
        item_id: cartLine.merchandise.product.id,
        item_name: cartLine.merchandise.product.title,
        item_brand: cartLine.merchandise.product.vendor,
        item_category: cartLine.merchandise.product.type,
        item_variant: cartLine.merchandise.title || "",
        price: cartLine.merchandise.price.amount,
        quantity: cartLine.quantity
      }]
    }
  };

  if (isPlatformActive("facebook")) {
    payload.fb_browser_side = {
      content_ids: [cartLine.merchandise.product.id],
      content_category: cartLine.merchandise.product.type,
      content_name: cartLine.merchandise.product.title,
      content_type: "product",
      contents: [{ id: cartLine.merchandise.product.id, quantity: cartLine.quantity, item_price: cartLine.merchandise.price.amount }],
      currency: cartLine.cost.totalAmount.currencyCode,
      value: cartLine.cost.totalAmount.amount
    };
  }

  if (isPlatformActive("pinterest")) {
    payload.pt_browser_side = {
      value: cartLine.cost.totalAmount.amount,
      order_quantity: cartLine.quantity,
      currency: cartLine.cost.totalAmount.currencyCode,
      line_items: [{
        product_name: cartLine.merchandise.product.title,
        product_id: cartLine.merchandise.product.id,
        product_variant_id: cartLine.merchandise.id,
        product_category: cartLine.merchandise.product.type,
        product_brand: cartLine.merchandise.product.vendor || "",
        product_price: cartLine.merchandise.price.amount,
        product_quantity: cartLine.quantity
      }]
    };
  }

  if (isPlatformActive("snapchat")) {
    payload.snap_browser_side = {
      price: cartLine.cost.totalAmount.amount,
      currency: cartLine.cost.totalAmount.currencyCode,
      item_ids: [cartLine.merchandise.product.id],
      item_category: cartLine.merchandise.product.type,
      brands: cartLine.merchandise.product.vendor ? [cartLine.merchandise.product.vendor] : []
    };
  }

  resetDataLayer();
  window.dataLayer.push({ ...payload, ...ctx });
});

// Remove From Cart
analytics.subscribe("product_removed_from_cart", event => {
  const ctx = getContextData();
  const cartLine = event.data?.cartLine;
  if (!cartLine) return;

  const productTitle = cartLine.merchandise.product.title || cartLine.merchandise.product.untranslatedTitle;

  const payload = {
    event: "remove_from_cart",
    client_id: event.clientId,
    event_time: event.timestamp,
    event_time_seconds: Math.round(new Date(event.timestamp) / 1000),
    event_source: "custom_pixel",
    product_variant_id: [cartLine.merchandise.id],
    product_sku: [cartLine.merchandise.sku],
    ecommerce: {
      currency: cartLine.cost.totalAmount.currencyCode,
      value: cartLine.cost.totalAmount.amount,
      items: [{
        item_id: cartLine.merchandise.product.id,
        item_name: productTitle,
        item_brand: cartLine.merchandise.product.vendor,
        item_category: cartLine.merchandise.product.type,
        item_variant: cartLine.merchandise.title || "",
        price: cartLine.merchandise.price.amount,
        quantity: cartLine.quantity
      }]
    }
  };

  if (isPlatformActive("facebook")) {
    payload.fb_browser_side = {
      content_ids: [cartLine.merchandise.product.id],
      content_category: cartLine.merchandise.product.type,
      content_name: productTitle,
      content_type: "product",
      contents: [{ id: cartLine.merchandise.product.id, quantity: cartLine.quantity, item_price: cartLine.merchandise.price.amount }],
      currency: cartLine.cost.totalAmount.currencyCode,
      value: cartLine.cost.totalAmount.amount
    };
  }

  if (isPlatformActive("pinterest")) {
    payload.pt_browser_side = {
      value: cartLine.cost.totalAmount.amount,
      order_quantity: cartLine.quantity,
      currency: cartLine.cost.totalAmount.currencyCode,
      line_items: [{
        product_name: productTitle,
        product_id: cartLine.merchandise.product.id,
        product_variant_id: cartLine.merchandise.id,
        product_category: cartLine.merchandise.product.type,
        product_brand: cartLine.merchandise.product.vendor || "",
        product_price: cartLine.merchandise.price.amount,
        product_quantity: cartLine.quantity
      }]
    };
  }

  if (isPlatformActive("snapchat")) {
    payload.snap_browser_side = {
      price: cartLine.cost.totalAmount.amount,
      currency: cartLine.cost.totalAmount.currencyCode,
      item_ids: [cartLine.merchandise.product.id],
      item_category: cartLine.merchandise.product.type,
      brands: cartLine.merchandise.product.vendor ? [cartLine.merchandise.product.vendor] : []
    };
  }

  resetDataLayer();
  window.dataLayer.push({ ...payload, ...ctx });
});

// View Cart
analytics.subscribe("cart_viewed", event => {
  const ctx = getContextData();
  const cart = event.data?.cart;
  if (!cart) return;

  const lines = cart.lines || [];
  const items = lines.map(line => ({
    item_id: line.merchandise.product.id,
    item_name: line.merchandise.product.title,
    item_brand: line.merchandise.product.vendor,
    item_category: line.merchandise.product.type,
    item_variant: line.merchandise.title || "",
    price: line.merchandise.price.amount,
    quantity: line.quantity
  }));

  const lineItemsAlt = lines.map(line => ({
    product_id: line.merchandise.product.id,
    product_name: line.merchandise.product.title,
    product_variant_id: line.merchandise.id,
    product_brand: line.merchandise.product.vendor || "",
    product_category: line.merchandise.product.type,
    product_price: line.merchandise.price.amount,
    product_quantity: line.quantity
  }));

  const productIds = lines.map(line => line.merchandise.product.id);
  const productTypes = lines.map(line => line.merchandise.product.type || "").filter(Boolean).join(",");
  const productVendors = lines.map(line => line.merchandise.product.vendor || "").filter(Boolean);
  const productTitles = lines.map(line => line.merchandise.product.title).join(", ");
  const contents = lines.map(line => ({
    id: line.merchandise.product.id,
    quantity: line.quantity,
    item_price: line.merchandise.price.amount
  }));

  const payload = {
    event: "view_cart",
    client_id: event.clientId,
    event_time: event.timestamp,
    event_time_seconds: Math.round(new Date(event.timestamp) / 1000),
    event_source: "custom_pixel",
    product_variant_id: lines.map(line => line.merchandise.id),
    product_sku: lines.map(line => line.merchandise.sku),
    itemTotalQuantity: cart.totalQuantity,
    ecommerce: {
      currency: cart.cost.totalAmount.currencyCode,
      value: cart.cost.totalAmount.amount,
      items: items
    }
  };

  if (isPlatformActive("facebook")) {
    payload.fb_browser_side = {
      content_ids: productIds,
      content_category: productTypes,
      content_name: productTitles,
      content_type: "product",
      contents: contents,
      currency: cart.cost.totalAmount.currencyCode,
      value: cart.cost.totalAmount.amount,
      num_items: cart.totalQuantity
    };
  }

  if (isPlatformActive("pinterest")) {
    payload.pt_browser_side = {
      value: cart.cost.totalAmount.amount,
      order_quantity: cart.totalQuantity,
      currency: cart.cost.totalAmount.currencyCode,
      line_items: lineItemsAlt
    };
  }

  if (isPlatformActive("snapchat")) {
    payload.snap_browser_side = {
      price: cart.cost.totalAmount.amount,
      currency: cart.cost.totalAmount.currencyCode,
      item_ids: productIds,
      item_category: productTypes,
      brands: productVendors,
      number_items: cart.totalQuantity
    };
  }

  resetDataLayer();
  window.dataLayer.push({ ...payload, ...ctx });
});

// Checkout Started
analytics.subscribe("checkout_started", event => {
  const ctx = getContextData();
  const payload = buildCheckoutPayload(event, "begin_checkout");
  resetDataLayer();
  window.dataLayer.push({ ...payload, ...ctx });
});

// Checkout Contact Info Submitted
analytics.subscribe("checkout_contact_info_submitted", event => {
  if (!checkout_contact_info_submitted_fired) {
    const ctx = getContextData();
    const payload = buildCheckoutPayload(event, "checkout_contact_info_submitted");
    resetDataLayer();
    window.dataLayer.push({ ...payload, ...ctx });
    checkout_contact_info_submitted_fired = true;
  }
});

// Checkout Address Info Submitted
analytics.subscribe("checkout_address_info_submitted", event => {
  if (!checkout_address_info_submitted_fired) {
    const ctx = getContextData();
    const payload = buildCheckoutPayload(event, "checkout_address_info_submitted");
    resetDataLayer();
    window.dataLayer.push({ ...payload, ...ctx });
    checkout_address_info_submitted_fired = true;
  }
});

// Checkout Shipping Info Submitted
analytics.subscribe("checkout_shipping_info_submitted", event => {
  if (!checkout_shipping_info_submitted_fired) {
    const ctx = getContextData();
    const payload = buildCheckoutPayload(event, "add_shipping_info");
    resetDataLayer();
    window.dataLayer.push({ ...payload, ...ctx });
    checkout_shipping_info_submitted_fired = true;
  }
});

// Payment Info Submitted
analytics.subscribe("payment_info_submitted", event => {
  const ctx = getContextData();
  const payload = buildCheckoutPayload(event, "add_payment_info");
  resetDataLayer();
  window.dataLayer.push({ ...payload, ...ctx });
});

// Checkout Completed / Purchase
analytics.subscribe("checkout_completed", event => {
  const ctx = getContextData();
  const payload = buildCheckoutPayload(event, "purchase");
  resetDataLayer();
  window.dataLayer.push({
    ...payload,
    ...ctx,
    page_location: event.context?.document?.location?.href,
    page_referrer: event.context?.document?.referrer,
    page_title: event.context?.document?.title,
    page_path: event.context?.document?.location?.pathname,
    search_param: event.context?.document?.location?.search,
    hash_param: event.context?.document?.location?.hash
  });
});

// Clicks & Scrolls
analytics.subscribe("click", event => window.dataLayer.push(event.customData));
analytics.subscribe("scroll_depth", event => window.dataLayer.push(event.customData));

// Search Submitted
analytics.subscribe("search_submitted", event => {
  const ctx = getContextData();
  const variants = event.data?.searchResult?.productVariants || [];

  const items = variants.map(v => ({
    item_id: v.product.id,
    item_name: v.product.title,
    item_brand: v.product.vendor,
    item_category: v.product.type,
    item_variant: v.title || "",
    price: v.price.amount,
    quantity: 1
  }));

  const totalVal = variants.reduce((acc, v) => acc + v.price.amount, 0);

  const basePayload = {
    event: "search",
    client_id: event.clientId,
    event_time: event.timestamp,
    event_time_seconds: Math.round(new Date(event.timestamp) / 1000),
    event_source: "custom_pixel",
    search_term: event.data?.searchResult?.query
  };

  if (isPlatformActive("facebook")) basePayload.fb_browser_side = { search_string: event.data?.searchResult?.query };
  if (isPlatformActive("pinterest")) basePayload.pt_browser_side = { search_query: event.data?.searchResult?.query };
  if (isPlatformActive("snapchat")) basePayload.snap_browser_side = { search_string: event.data?.searchResult?.query };

  resetDataLayer();
  window.dataLayer.push({ ...basePayload, ...ctx });

  window.dataLayer.push({
    event: "view_search_results",
    client_id: event.clientId,
    page_location: event.context?.document?.location?.href,
    page_referrer: event.context?.document?.referrer,
    page_title: event.context?.document?.title,
    page_path: event.context?.document?.location?.pathname,
    search_param: event.context?.document?.location?.search,
    hash_param: event.context?.document?.location?.hash,
    language: event.context?.navigator?.language,
    screen_width: event.context?.window?.outerWidth,
    screen_height: event.context?.window?.outerHeight,
    user_agent: event.context?.navigator?.userAgent,
    event_time: event.timestamp,
    event_time_seconds: Math.floor(new Date(event.timestamp) / 1000),
    product_variant_id: variants.map(v => v.id),
    product_sku: variants.map(v => v.sku),
    event_source: "custom_pixel",
    search_term: event.data?.searchResult?.query,
    ecommerce: { value: totalVal, items: items }
  });
});

// Collection Viewed
analytics.subscribe("collection_viewed", event => {
  const ctx = getContextData();
  const collection = event.data?.collection;
  if (!collection) return;

  const variants = collection.productVariants || [];
  const items = variants.map(v => ({
    item_id: v.product.id,
    item_name: v.product.title,
    item_brand: v.product.vendor,
    item_category: v.product.type,
    item_variant: v.title || "",
    price: v.price.amount,
    quantity: 1
  }));

  const lineItemsAlt = variants.map(v => ({
    product_id: v.product.id,
    product_name: v.product.title,
    product_variant_id: v.id,
    product_brand: v.product.vendor || "",
    product_category: v.product.type,
    product_price: v.price.amount,
    product_quantity: 1
  }));

  const productIds = variants.map(v => v.product.id);
  const productTypes = variants.map(v => v.product.type || "").filter(Boolean).join(",");
  const productTitles = variants.map(v => v.product.title).join(", ");
  const contents = variants.map(v => ({ id: v.product.id, quantity: 1, item_price: v.price.amount }));

  const payload = {
    event: "view_item_list",
    client_id: event.clientId,
    event_time: event.timestamp,
    event_time_seconds: Math.round(new Date(event.timestamp) / 1000),
    event_source: "custom_pixel",
    product_variant_id: variants.map(v => v.id),
    product_sku: variants.map(v => v.sku),
    ecommerce: {
      item_list_id: collection.id,
      item_list_name: collection.title,
      items: items
    }
  };

  if (isPlatformActive("facebook")) {
    payload.fb_browser_side = {
      content_ids: productIds,
      content_category: productTypes,
      content_name: productTitles,
      content_type: "product",
      contents: contents
    };
  }

  if (isPlatformActive("pinterest")) payload.pt_browser_side = { line_items: lineItemsAlt };
  if (isPlatformActive("snapchat")) {
    payload.snap_browser_side = {
      item_list_id: collection.id,
      item_list_name: collection.title,
      item_ids: productIds
    };
  }

  resetDataLayer();
  window.dataLayer.push({ ...payload, ...ctx });
});

// Form Submitted
analytics.subscribe("form_submitted", event => {
  const ctx = getContextData();
  const payload = {
    event: "form_submit",
    client_id: event.clientId,
    event_time: event.timestamp,
    event_time_seconds: Math.round(new Date(event.timestamp) / 1000),
    event_source: "custom_pixel",
    id: event.data?.element?.id || undefined,
    action: event.data?.element?.action || undefined,
    elements: event.data?.element?.elements || undefined
  };
  resetDataLayer();
  window.dataLayer.push({ ...payload, ...ctx });
});




/**
 * Developer Information:
 * Name: Malakul Maksud
 * Phone Number: +8801576560470 (WhatsApp)
 * Website: https://www.linkedin.com/in/malakul-maksud/
 * LinkedIn: https://malakulmaksud.com
 */
