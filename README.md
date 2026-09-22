# shopify-custom-pixel-datalayer
To use the shopify-datalayer.js file stored in your GitHub repository for your Shopify store, you need to copy its code and add it as a Custom Pixel in Shopify.   Here is how you can do it step-by-step:Step 
1: Copy the Code from GitHub
**Click on shopify-datalayer.js inside your GitHub repository.   
**Once the file opens, you will see the code. Click the Copy button (the two overlapping squares icon, usually near the top right of the code block) to copy the entire script.Step 

2: Add the Custom Pixel in Shopify
**Log in to your Shopify Admin panel.
**Go to Settings (bottom left corner) > Customer events.
**Click the Add custom pixel button in the top right.
**Give your pixel a name (e.g., GTM DataLayer Pixel) and click Add pixel.


Step 3: Paste and Save
**Delete any boilerplate code already in the code editor window.
**Paste the code you copied from GitHub.
**Click Save in the top right corner.
**Click Connect to activate the pixel on your store.
**Your data layer and tracking setup are now live and connected via Shopify's Customer Pixels!


To change your Google Tag Manager (GTM) ID, you just need to replace the existing ID (GTM-K3BWVM8) with your own GTM container ID in the code.

Where to find it in your code:
Near the top of your shopify-datalayer.js file, inside the GTM script loader function, you will see your current GTM ID at the very bottom:

JavaScript
})(window, document, 'script', 'dataLayer', 'GTM-K3BWVM8'); // <--- Change this ID
How to update it:
Option A: Update it directly in GitHub

**Go to your repository on GitHub and click on shopify-datalayer.js.
**Click the Pencil icon (Edit this file) near the top-right of the code view.
**Find GTM-K3BWVM8 and replace it with your new GTM ID (for example, GTM-XXXXXXX).
**Click Commit changes... at the top right, add a note (e.g., Update GTM ID), and confirm.
**Copy the updated code and paste it back into your Shopify Customer Pixel settings.



Option B: Update it directly in Shopify
**Go to your Shopify Admin > Settings > Customer events.
**Click on your custom pixel.
**Find GTM-K3BWVM8 in the editor and replace it with your new GTM ID.
**Click Save.

