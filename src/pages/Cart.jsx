import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Heart, ShoppingBag } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchCart = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("cart_items")
        .select("listings(*, listing_images(url))")
        .eq("user_id", user.id);

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Error fetching cart items:", error.message || error);
        setCartItems([]);
      } else {
        setCartItems(
          (data ?? []).map((row) => ({
            ...row.listings,
            image_url:
              row.listings.listing_images?.[0]?.url || row.listings.image_url,
          }))
        );
      }

      setLoading(false);
    };

    fetchCart();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleRemove = async (event, listingId) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user?.id) return;

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    if (error) {
      console.error("Error removing from cart:", error.message || error);
      return;
    }

    setCartItems((current) => current.filter((item) => item.id !== listingId));
  };

  const handleMoveToLiked = async (event, listingId) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user?.id) return;

    // Insert into likes table
    const { error: insertError } = await supabase
      .from("likes")
      .insert({ user_id: user.id, listing_id: listingId })
      .single();

    // Ignore conflict errors (item already liked)
    if (insertError && insertError.code !== "23505") {
      console.error("Error adding to likes:", insertError.message || insertError);
      return;
    }

    // Delete from cart
    const { error: deleteError } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    if (deleteError) {
      console.error("Error removing from cart:", deleteError.message || deleteError);
      return;
    }

    setCartItems((current) => current.filter((item) => item.id !== listingId));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price_cents || 0), 0);
  const subtotalFormatted = (subtotal / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-40">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-semibold text-white">Shopping Cart</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="bg-white/5 rounded-lg p-12 border border-red-600/20 text-center">
            <ShoppingBag className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300 text-lg mb-6">
              Your cart is empty. Browse to find items you'd like to buy.
            </p>
            <Link
              to="/browse"
              className="inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => {
              const price = (item.price_cents / 100).toFixed(2);

              return (
                <Link
                  key={item.id}
                  to={`/listing/${item.id}`}
                  className="block"
                >
                  <div className="bg-white/5 rounded-lg p-4 border border-red-600/20 hover:border-red-400/40 hover:bg-white/10 transition cursor-pointer">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-24 h-24">
                        <img
                          src={item.image_url || "/placeholder.jpg"}
                          alt={item.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {item.title}
                        </h3>
                        <p className="text-slate-400 text-sm">{item.brand}</p>
                        {item.size && (
                          <p className="text-slate-400 text-sm">Size: {item.size}</p>
                        )}
                      </div>

                      {/* Price and Actions */}
                      <div className="flex flex-col items-end justify-between">
                        <p className="text-xl font-bold text-red-600">${price}</p>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleMoveToLiked(e, item.id)}
                            className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-red-400 hover:text-red-300 transition"
                            title="Move to liked"
                          >
                            <Heart className="w-5 h-5" />
                          </button>

                          <button
                            onClick={(e) => handleRemove(e, item.id)}
                            className="p-2 rounded-md bg-white/10 hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Summary Card */}
      {!loading && cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-red-600/30 p-4">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Subtotal</p>
                <p className="text-3xl font-bold text-white">${subtotalFormatted}</p>
              </div>

              <button
                onClick={() => alert("Checkout coming in Phase 11")}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition whitespace-nowrap"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
