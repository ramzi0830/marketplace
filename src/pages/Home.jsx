import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import ListingCard from '../components/ListingCard.jsx';

const Home = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          brand,
          size,
          price_cents,
          created_at,
          listing_images(url)
        `)
        .order('created_at', { ascending: false })
        .limit(24);

      if (error) {
        console.error('Error fetching listings:', error);
      } else {
        // Assuming listing_images is an array, take the first image
        const listingsWithImages = data.map(listing => ({
          ...listing,
          image_url: listing.listing_images?.[0]?.url || '/placeholder.jpg'
        }));
        setListings(listingsWithImages);
      }
      setLoading(false);
    };

    fetchListings();
  }, []);

  const categories = ['Clothing', 'Vinyl', 'CDs', 'Jewelry', 'Other'];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">Buy + sell clothing, vinyl, CDs, and Jewelry</h1>
      </section>

      {/* Categories */}
      <section className="px-4 mb-10">
        <div className="flex flex-wrap justify-center gap-4">
          {categories.map(category => (
            <Link
              key={category}
              to={`/browse?category=${category.toLowerCase()}`}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      {/* Listings Grid */}
      <section className="px-4 pb-10">
        <h2 className="text-3xl font-semibold mb-6 text-center">Newest Listings</h2>
        {loading ? (
          <div className="text-center text-xl">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="text-center text-xl">No listings yet</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;