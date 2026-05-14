import React from 'react';

const ListingCard = ({ listing }) => {
  const price = (listing.price_cents / 100).toFixed(2);

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-red-600/20 hover:border-red-600/40 transition">
      <img
        src={listing.image_url || '/placeholder.jpg'}
        alt={listing.title}
        className="w-full h-48 object-cover rounded-md mb-4"
      />
      <h3 className="text-lg font-semibold text-white mb-1">{listing.title}</h3>
      <p className="text-slate-300 text-sm">{listing.brand}</p>
      <p className="text-slate-300 text-sm">{listing.size}</p>
      <p className="text-red-500 font-bold text-lg">${price}</p>
    </div>
  );
};

export default ListingCard;