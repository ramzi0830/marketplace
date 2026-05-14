import { Link } from 'react-router-dom';

const ListingCard = ({ listing }) => {
  const price = (listing.price_cents / 100).toFixed(2);

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="block transform transition duration-200 ease-out hover:scale-[1.02] hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] cursor-pointer"
    >
      <div className="bg-white/5 rounded-lg p-4 border border-red-600/20 transition">
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
    </Link>
  );
};

export default ListingCard;