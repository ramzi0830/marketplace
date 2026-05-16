import { useEffect, useState } from "react";
import ListingCard from "../components/ListingCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const Liked = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchLikes = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("likes")
        .select("listings(*, listing_images(url))")
        .eq("user_id", user.id);

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Error fetching liked listings:", error.message || error);
        setListings([]);
      } else {
        setListings(
          (data ?? []).map((row) => ({
            ...row.listings,
            image_url:
              row.listings.listing_images?.[0]?.url || row.listings.image_url,
          }))
        );
      }

      setLoading(false);
    };

    fetchLikes();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleRemoveLike = async (event, listingId) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user?.id) return;

    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    if (error) {
      console.error("Error removing like:", error.message || error);
      return;
    }

    setListings((current) => current.filter((listing) => listing.id !== listingId));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-white mb-6">Liked Items</h1>

        {loading ? (
          <div className="text-slate-300">Loading liked items...</div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-red-600/30 bg-white/5 p-8 text-slate-300 max-w-2xl">
            No liked items yet. Tap the heart on anything to save it here.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <div key={listing.id} className="relative rounded-3xl overflow-hidden">
                <button
                  type="button"
                  onClick={(event) => handleRemoveLike(event, listing.id)}
                  className="absolute right-3 top-3 z-10 rounded-full bg-[#0a0a0a]/90 border border-red-600/40 px-2.5 py-1.5 text-sm font-bold text-white transition hover:bg-red-600/90"
                >
                  X
                </button>
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Liked;
