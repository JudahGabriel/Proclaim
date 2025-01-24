class ProclaimCheckout {
   unavailableCampsites = []; // Array of { night: "Wednesday", campsite: "t-51", id: 9489 }
   allCampsites = []; // Array of { night: "Wednesday", campsite: "t-51", id: 9489 }
   isAddingLodgingToCart = false;
   cartContents = []; // Array of cart items, e.g. { id: 7984, quantity: 1, name: "Full Event Pass", ... }
   tshirtId = 9671;
   
   init() {
      this.makeBtnsAjax();
      this.fetchAllCampsites().then(results => this.allCampsites = results);
      this.fetchUnavailableCampsites().then(results => this.unavailableCampsites = results);
      this.disableMoreThan5NightsAtCampsite();
      this.fetchCartContents().then(results => this.cartContents = results);
      this.listenForWooCommerceEvents();
      this.setupCampsitePicker();
      this.scrollToTeeShirtAsNecessary();

      // Disable add to cart buttons while registration is closed for the off-season.
      // this.disableAddToCartBtns();
   }

   makeBtnsAjax() {
      // Append the woo-ajax-add-to-cart plugin script.
      // This makes the "add to cart" use AJAX rather than page reload.
      // This script is automatically loaded on product pages, but not on our custom register page here.
      const ajaxAddToCartScript = document.createElement("script");
      ajaxAddToCartScript.src = "/wp-content/plugins/woo-ajax-add-to-cart/assets/frontend/woo-ajax-add-to-cart.js";
      document.body.appendChild(ajaxAddToCartScript);
   }

   disableAddToCartBtns() {
      // Disable the Add to Cart buttons.
      Array.from(document.querySelectorAll(".single_add_to_cart_button")).forEach(btn => btn.disabled = true);

      // Hide the quantity UI.
      Array.from(document.querySelectorAll(".quantity")).forEach(div => div.style.display = "none");

      // Disable the Choose campsite button.
      Array.from(document.querySelectorAll(".choose-campsite-btn-container button")).forEach(btn => btn.disabled = true);

      // Fade out all the sections.
      Array.from(document.querySelectorAll("[data-anchor]")).forEach(div => div.style.opacity = 0.4);
   }

   listenForWooCommerceEvents() {
      // Listen for cart change events so we can keep track of what's in the cart.
      // We need this to show warning messages when the user does weird stuff, such as adding both a family event pass and an individual event pass.
      jQuery(document.body).on("added_to_cart", (e) => this.addedToCart(e));
      jQuery(document.body).on("removed_from_cart", (e) => this.removedFromCart(e));

      // When we click the add to cart button, we want to disable the button until it's added to cart.
      jQuery(document).on("click", ".single_add_to_cart_button:not(.disabled)", e => this.addToCartBtnClicked(e));

      // When the user makes a selection, reset all add-to-cart buttons.
      // This will clear any "✔ Added to cart" text back to "Add to cart"
      jQuery(document.body).on("woocommerce_variation_select_change", e => this.resetAddToCartBtn(e));

      // When we select a t-shirt color, show the t-shirt image.
      jQuery(document.body).on("woocommerce_variation_select_change", e => this.showTShirtImage(e));
   }

   /**
    * 
    * @param {UIEvent} e 
    * @returns 
    */
   addToCartBtnClicked(e) {
      const btn = e.target;
      if (btn) {
         btn.disabled = true;
         btn.classList.add("async-adding");
         btn.innerHTML = "<i class='fa fa-circle-o-notch fa-spin fa-fw'></i>&nbsp;<span>Adding to cart...</span>";

         const isLodgingAddToCartBtn = !!e.target.closest("#product-8045");
         if (isLodgingAddToCartBtn) {
            this.isAddingLodgingToCart = true;
         }

         return true; // needed to bubble the event up for jQuery
      }
   }

   /**
    * @param {Event} e 
    */
   resetAddToCartBtn(e) {
      if (e.target) {
         const addToCartBtn = e.target.querySelector(".single_add_to_cart_button");
         if (addToCartBtn) {
            addToCartBtn.innerText = "Add to cart";
         }
      }
   }

   /**
    * Called when a variation selection has changed (woocommerce_variation_select_change event).
    * Purpose here is to set the t-shirt image preview if the user changed the t-shirt color selector.
    * @param {Event} e 
    */
   showTShirtImage(e) {
      const targetForm = e.target;
      const isTeeForm = targetForm ? !!jQuery(targetForm).parent(`#product-${this.tshirtId}`) : false;
      const designSelector = targetForm ? targetForm.querySelector("#design") : null;
      if (targetForm && isTeeForm && designSelector) {
         const teeImages = {
            "New Song Tshirt Sandstone": [
               "/wp-content/uploads/2024/03/New-Song-Tshirt-Sandstone-Front-Proclaim2025.jpg", 
               "/wp-content/uploads/2024/03/New-Song-Tshirt-Sandstone-Back-Proclaim2025.jpg", 
            ],
            "New Song Tshirt Blue Spruce": [
               "/wp-content/uploads/2024/03/New-Song-Tshirt-Blue-Spruce-Front-Proclaim2025.jpg", 
               "/wp-content/uploads/2024/03/New-Song-Tshirt-Blue-Spruce-Back-Proclaim2025.jpg",
            ],
            "Kingdom Family Tshirt Pepper": [
               "/wp-content/uploads/2024/03/Kingdom-Family-Tshirt-Pepper-Front-Proclaim2025.jpg",
               "/wp-content/uploads/2024/03/Kingdom-Family-Tshirt-Pepper-Back-Proclaim2025.jpg"
            ],
            "Kingdom Family Kids Tshirt Pepper": [
               "/wp-content/uploads/2024/03/Kingdom-Family-Tshirt-Pepper-Front-Proclaim2025.jpg",
               "/wp-content/uploads/2024/03/Kingdom-Family-Tshirt-Pepper-Back-Proclaim2025.jpg"
            ],
            "Kingdom Family Sweatshirt Pepper": [
               "/wp-content/uploads/2024/03/Kingdom-Family-Sweatshirt-Pepper-Front-Proclaim2025.jpg",
               "/wp-content/uploads/2024/03/Kingdom-Family-Sweatshirt-Pepper-Back-Proclaim2025.jpg"
            ],
            "Kingdom Family Sweatshirt Blue Spruce": [
               "/wp-content/uploads/2024/03/Kingdom-Family-Sweatshirt-Blue-Spruce-Front-Proclaim2025.jpg",
               "/wp-content/uploads/2024/03/Kingdom-Family-Sweatshirt-Blue-Spruce-Back-Proclaim2025.jpg"
            ],
            "Kingdom Family Sweatshirt Blue Spruce": [
               "/wp-content/uploads/2024/03/Kingdom-Family-Sweatshirt-Blue-Spruce-Front-Proclaim2025.jpg",
               "/wp-content/uploads/2024/03/Kingdom-Family-Sweatshirt-Blue-Spruce-Back-Proclaim2025.jpg"
            ]
         };

         const selectedDesign = (designSelector.value || "").toLowerCase();
         const imagesToUse = teeImages[selectedDesign];
         if (imagesToUse) {
            const imageLinks = Array.from(document.querySelectorAll(".shirt-imgs-container a") || []);
            imageLinks.forEach((link, index) => link.href = imagesToUse[index]);
            const images = Array.from(document.querySelectorAll(".shirt-imgs-container img") || []);
            images.forEach((img, index) => img.src = imagesToUse[index]);
         }
      }
   }

   scrollToTeeShirtAsNecessary() {
      if (location.hash === "#proclaim-tee") {
         window.addEventListener("load", function () {
            const teeHeader = document.querySelector("#proclaimtee h2");
            if (teeHeader) {
               clearInterval(intervalHandle);
               teeHeader.scrollIntoView();
            }
         }, { once: true });
      }
   }

   /**
    * 
    * @param {UIEve} e 
    */
   addedToCart() {
      const btn = document.querySelector(".single_add_to_cart_button.async-adding");
      if (btn) {
         btn.disabled = false;
         btn.classList.remove("async-adding");
         btn.innerText = "✔ Added to cart";
      }

      // Also, if we have any selected campsite header, clear it.
      const chosenSiteHeader = document.querySelector(".chosen-site-header");
      chosenSiteHeader.style.display = "none";

      // Refresh our cart contents.
      this.fetchCartContents().then(result => this.cartContents = result);
   }

   removedFromCart() {
      // Refresh our cart contents.
      this.fetchCartContents().then(result => this.cartContents = result);
   }
   
   showEventPassWarning(warningMessage, passTypeSelector) {
      let eventPassAlertElement = document.querySelector(".event-pass-warning");
      if (!eventPassAlertElement) {
         eventPassAlertElement = this.createEventPassAlert(passTypeSelector);
      }

      eventPassAlertElement.querySelector(".message").innerText = warningMessage;
      eventPassAlertElement.closest("tr").style.display = "block";
   }

   hideEventPassWarning() {
      const eventPassAlertElement = document.querySelector(".event-pass-warning");
      if (eventPassAlertElement) {
         eventPassAlertElement.closest("tr").style.display = "none";
      }
   }

   createEventPassAlert(passTypeSelector) {
      const tableBody = passTypeSelector.closest("tbody");
      const alertRow = document.createElement("tr");
      alertRow.innerHTML = `
            <th class="label">
               <label></label>
            </th>
            <td class="value">
               <div class="warning event-pass-warning">
                  ⚠ <span class="message"></span>
                  <a href="/cart" target="_blank">View cart</a>
               </div>
            </td>`;
      tableBody.appendChild(alertRow);

      return alertRow;
   }

   disableMoreThan5NightsAtCampsite() {
      // Disable the "add to cart" button if the user is trying to add more than 5 nights lodging.
      const nightsInput = document.querySelector("#product-8045 .input-text.qty");
      const plusBtn = document.querySelector("#product-8045 .wt-quantity-plus");
      if (nightsInput && plusBtn) {
         plusBtn.addEventListener("click", () => {
            const val = parseInt(nightsInput.value, 10);
            if (val >= 4) {
               nightsInput.value = "4"; // set it to 4 so that the natural event handler for the + button will increment to 5
            }
         });

         nightsInput.addEventListener("change", () => {
            const val = parseInt(nightsInput.value, 10);
            if (val >= 5) {
               nightsInput.value = "5";
            }
         });
      }
   }

   setupCampsitePicker() {
      // Hide the default campsite selector row, which contains just a select input to choose the site.
      const campsiteRow = campsite.closest("tr"); // campsite variable here is the campsite <select> element.
      campsiteRow.style.display = "none";

      // Append a new row with our "choose campsite" button.
      const newRow = this.createCampsitePickerRow(campsiteRow.parentElement);

      // Above the quantity selector, append a header "How many nights will you be staying?"
      const campsiteQuantityContainer = document.querySelector("#product-8045 .single_variation_wrap");
      if (campsiteQuantityContainer) {
         const header = document.createElement("h5");
         header.innerText = "How many nights?";
         campsiteQuantityContainer.insertBefore(header, campsiteQuantityContainer.firstChild);
      }

      // The campsite picker iframe communicates with us via message posting. Listen for that.
      window.addEventListener("message", e => {
         if (e.data.message === "cancel") {
            this.closeIframe();
         } else if (e.data.message === "site-chosen") {
            this.siteChosen(e.data.site);
         }
      });
   }

   /**
    * 
    * @param {HTMLElement} rowParent 
    * @returns 
    */
   createCampsitePickerRow(rowParent) {
      const row = document.createElement("tr");
      //row.style.display = "none"; // hide the row initially. We'll show it when ready.
      const headerCell = document.createElement("th");
      headerCell.className = "label";
      const headerLabel = document.createElement("label");
      headerLabel.innerText = "Campsite";
      headerLabel.setAttribute("for", "chooseCampsiteBtn");
      headerCell.appendChild(headerLabel);
      const valueCell = document.createElement("td");
      row.appendChild(headerCell);
      row.appendChild(valueCell);
      rowParent.appendChild(row);

      // The flexbox to contain the chosen site header and the choose site button.
      const cellValueFlexBox = document.createElement("div");
      cellValueFlexBox.className = "choose-campsite-btn-container";

      // The chosen campsite h4
      const chosenSiteHeader = document.createElement("h4");
      chosenSiteHeader.className = "chosen-site-header";
      cellValueFlexBox.appendChild(chosenSiteHeader);

      // The choose campsite button
      const chooseCampsiteBtn = document.createElement("button");
      chooseCampsiteBtn.innerText = "Choose campsite...";
      chooseCampsiteBtn.className = "wvc-button wvc-button-background-color-darkgrey wvc-button-shape-boxed wvc-button-size-sm wvc-button-hover-opacity";
      chooseCampsiteBtn.id = "chooseCampsiteBtn";
      chooseCampsiteBtn.addEventListener("click", e => this.chooseCampsiteClicked(e));
      cellValueFlexBox.appendChild(chooseCampsiteBtn);

      valueCell.appendChild(cellValueFlexBox);
      return row;
   }

   /**
    * 
    * @param {UIEvent} e 
    */
   chooseCampsiteClicked(e) {
      e.preventDefault();

      // Create our iframe.
      const pickerFrame = document.createElement("iframe");
      const unavailableCampsites = this.unavailableCampsites.map(s => s.campsite);
      pickerFrame.src = `https://judahgabriel.github.io/Proclaim/campsite-picker-2025.html?disable=${unavailableCampsites.join(",")}`;
      pickerFrame.title = "Choose your campsite";

      // Create our container which will allow scrolling as needed.
      const container = document.createElement("div");
      container.className = "campsite-picker";
      container.appendChild(pickerFrame);
      container.style.display = "none";

      document.body.appendChild(container);
      jQuery(container).fadeIn();

      // Temporarily remove scrollbars from the body so we don't have 2x scrollbar
      document.body.classList.add("noscrollbars");
   }

   closeIframe() {
      document.body.classList.remove("noscrollbars");
      const iframe = document.querySelector(".campsite-picker");
      if (iframe) {
         jQuery(iframe).fadeOut(() => iframe.remove());
      }
   }

   /**
    * 
    * @param {string} siteId 
    */
   siteChosen(siteId) {
      this.closeIframe();

      const productId = this.getCampsiteProductId(siteId);

      // Set the variation value so that we can add to cart.
      const hiddenVariationField = document.querySelector("#product-8045 .variation_id");
      hiddenVariationField.value = productId;

      // Remove the disabled and validation classes from the add to cart button. 
      const addToCartBtn = document.querySelector("#product-8045 .single_add_to_cart_button");
      addToCartBtn.classList.remove("wc-variation-selection-needed");
      addToCartBtn.classList.remove("disabled");

      // Show the selected site.
      const selectedSiteHeader = document.querySelector(".chosen-site-header");
      selectedSiteHeader.innerText = siteId.toUpperCase();
      selectedSiteHeader.style.display = "block";
   }

   getCampsiteProductId(campsiteName) {
      const product = this.allCampsites.find(c => c.campsite === campsiteName)
      if (!product) {
         throw new Error("Couldn't find campsite name " + campsiteName);
      }
      return product.id;
   }

   /**
    * Fetches the campsites that are currently reserved.
    * @returns {Array} An array of { night: "Wednesday", campsite: "t-51", id: 8839 }. NOTE: as of 2024, night will always be an empty string, as we no longer support per-night campsites. Instead, campsites are rented for the whole event.
    */
   fetchUnavailableCampsites() {
      const maxRetries = 3;
      const url = "https://inventory.proclaimmusicfestival.com/inventory/getOutOfInventoryLodgingNightCampsite";
      return this.fetchJson(url, maxRetries);
   }

   /**
    * Fetches all campsites.
    * * @returns {Array} An array of { night: "Wednesday", campsite: "t-51", id: 8839 }. NOTE: as of 2024, night will always be an empty string, as we no longer support per-night campsites. Instead, campsites are rented for the whole event.
    */
   fetchAllCampsites() {
      const maxRetries = 3;
      const url = "https://inventory.proclaimmusicfestival.com/inventory/getAllCampsites";
      return this.fetchJson(url, maxRetries);
   }

   fetchCartContents() {
      const url = "/wp-json/wc/store/v1/cart/items";
      return this.fetchJson(url, 0).then(results => {
         return results;
      });
   }

   async fetchJson(url, maxRetries) {
      let requestResult = null;
      try {
         requestResult = await fetch(url);
         if (!requestResult.ok) {
            throw new Error(`Error fetching ${url}. Status ${requestResult.status}. Status text ${requestResult.statusText}`);
         }
         const jsonResults = await requestResult.json(); // returns an array of products
         return jsonResults;
      } catch (error) {
         if (maxRetries > 0) {
            await new Promise((resolve) => setTimeout(() => resolve(), 1000)); // Wait a sec before retrying.
            return this.fetchJson(url, maxRetries - 1);
         } else {
            throw error;
         }
      }
   }
}

new ProclaimCheckout().init();
