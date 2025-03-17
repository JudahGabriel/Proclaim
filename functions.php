<?php
/**
 * Decibel functions and definitions
 *
 * @link https://codex.wordpress.org/Theme_Development
 * @link https://codex.wordpress.org/Child_Themes
 *
 * Functions that are not pluggable (not wrapped in function_exists()) are
 * instead attached to a filter or action hook.
 *
 * For more information on hooks, actions, and filters,
 * {@link https://codex.wordpress.org/Plugin_API}
 *
 * @package    WordPress
 * @subpackage Decibel
 * @version    3.4.4
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sets up theme defaults and registers support for various WordPress features using the DECIBEL function
 *
 * @see inc/framework.php
 */
function decibel_setup_config() {
	/**
	 *  Require the wolf themes framework core file
	 */
	include_once get_template_directory() . '/inc/framework.php';

	/**
	 * Set theme main settings
	 *
	 * We this array to configure the main theme settings
	 */
	$decibel_settings = array(

		/* Menus */
		'menus'       => array(
			'primary'   => esc_html__( 'Primary Menu', 'decibel' ),
			'secondary' => esc_html__( 'Secondary Menu', 'decibel' ),
			'mobile'    => esc_html__( 'Mobile Menu (optional)', 'decibel' ),
		),

		/**
		 *  We define wordpress thumbnail sizes that we will use in our design
		 */
		'image_sizes' => array(

			/**
			 * Create custom image sizes if the Wolf WPBakery Page Builder extension plugin is not installed
			 * We will use the same image size names to avoid duplicated image sizes in the case the plugin is active
			 */
			'decibel-photo'         => array( 500, 500, false ),
			'decibel-metro'         => array( 550, 999, false ),
			'decibel-masonry'       => array( 500, 2000, false ),
			'decibel-masonry-small' => array( 400, 400, false ),
			'decibel-XL'            => array( 1920, 3000, false ),
		),
	);

	DECIBEL( $decibel_settings ); // let's go.
}
decibel_setup_config();
add_filter( 'woocommerce_should_load_paypal_standard', '__return_true' );

// Judah's function for marking a campsite as out-of-stock when a user reserves it.
add_action('woocommerce_payment_complete', 'mark_product_out_of_stock_on_order_completion');
function mark_product_out_of_stock_on_order_completion($order_id) {
	$order = wc_get_order($order_id);

	// Get all items in the order
	$items = $order->get_items();

	// See if there are any lodging products in the order.
	foreach ($items as $item) {
		$product_id = $item->get_product_id();
		if ($product_id == 8045) {  // It's the generic Lodging product
			// Mark the lodging variant (e.g. t-28) as out of stock.
			$variation_id = $item->get_variation_id();
			if ($variation_id) {
				$product = wc_get_product($variation_id);
				$product->set_stock_status('outofstock');
				$product->save();
			}
		}
	}
}

// Judah's function for marking a campsite as in stock when a user cancels their order or we refund the order.
add_action('woocommerce_order_status_cancelled', 'mark_product_in_stock_on_order_cancelled', 10, 1);
add_action('woocommerce_order_refunded', 'mark_product_in_stock_on_order_cancelled', 10, 1);
function mark_product_in_stock_on_order_cancelled($order_id) {
	$order = wc_get_order($order_id);

	// Get all items in the order
	$items = $order->get_items();

	// See if there are any lodging products in the order.
	foreach ($items as $item) {
		$product_id = $item->get_product_id();
		if ($product_id == 8045) {  // It's the lodging product
			// Mark the lodging variant (e.g. t-28) as in stock.
			$variation_id = $item->get_variation_id();
			if ($variation_id) {
				$product = wc_get_product($variation_id);
				$product->set_stock_status('instock');
				$product->save();
			}
		}
	}
}

// Judah's function for adding the vendor questions on checkout if the user has a vendor table in their cart.
// It also updates "how many in party" to show up only if tickets are purchased.
add_filter('woocommerce_checkout_fields', 'conditional_checkout_fields_products');
function conditional_checkout_fields_products($fields) {
	// Check if product with category "vendor" is in the cart
    $is_vendor_product_in_cart = false;
	$is_ticket_in_cart = false;

    foreach (WC()->cart->get_cart() as $cart_item) {
        $product_id = $cart_item['product_id'];
        $product_categories = get_the_terms($product_id, 'product_cat');

        if ($product_categories && is_array($product_categories)) {
            foreach ($product_categories as $category) {
                if ($category->slug === 'vendor') {
                    $is_vendor_product_in_cart = true;
                } else if ($category->slug === 'tickets') {
					$is_ticket_in_cart = true;
				}
            }
        }
    }

    // If a vendor table is in the cart, make the fields required.
    if ($is_vendor_product_in_cart) {
        $fields['billing']['vendor_business']['required'] = false; // Business name isn't required, but we want to show it.
		$fields['billing']['vendor_products']['required'] = true;
		$fields['billing']['vendor_tables_needed']['required'] = true;
		$fields['billing']['vendor_freestanding']['required'] = true;
		$fields['billing']['vendor_acknowledgement']['required'] = true;
		$fields['billing']['vendor_best_way_to_contact']['required'] = true;
    } else {
		// If there is no vendor table in the cart, hide the vendor products and vendor business name fields
		unset($fields['billing']['vendor_business']);
		unset($fields['billing']['vendor_products']);
		unset($fields['billing']['vendor_tables_needed']);
		unset($fields['billing']['vendor_freestanding']);
		unset($fields['billing']['vendor_acknowledgement']);
		unset($fields['billing']['vendor_best_way_to_contact']);
	}
	
	// If a ticket is in cart, ask how many in party.
	if ($is_ticket_in_cart) {
		$fields['billing']['how_many_in_party']['required'] = true;
	} else {
		unset($fields['billing']['how_many_in_party']);
	}

    return $fields;
}

/**
 * Judah's function for adding the "how many in your party" to the "You've received a new order" email.
 */
add_filter( 'woocommerce_email_order_meta_fields', 'custom_woocommerce_email_order_meta_fields', 10, 3 );
function custom_woocommerce_email_order_meta_fields( $fields, $sent_to_admin, $order ) {
	$key = 'how_many_in_party';
	$val = get_post_meta( $order->get_id(), $key, true );

    if (!empty($val)) {
    	$fields[$key] = array(
        	'label' => __( 'How many in party' ),
        	'value' => $val
    	);
	}

    return $fields;
}
