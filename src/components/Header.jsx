import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Heart, ShoppingCart, Menu, X, Camera, LogOut, ChevronDown, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [likeCount, setLikeCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch and subscribe to likes and cart counts
  useEffect(() => {
    if (!user) {
      setLikeCount(0);
      setCartCount(0);
      return;
    }

    // Fetch initial counts
    const fetchCounts = async () => {
      try {
        const [likesRes, cartRes] = await Promise.all([
          supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("cart_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        if (likesRes.count !== null) setLikeCount(likesRes.count);
        if (cartRes.count !== null) setCartCount(cartRes.count);
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };

    fetchCounts();

    // Subscribe to realtime changes for likes
    const likesChannel = supabase
      .channel(`likes-changes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "likes",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for cart items
    const cartChannel = supabase
      .channel(`cart-changes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(cartChannel);
    };
  }, [user]);

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a] text-white border-b border-white/10">
      <div className="px-4 md:px-8 py-4">
        <div className="flex items-center justify-between gap-4 md:gap-8">
          {/* Logo */}
          <Link
            to="/"
            className="flex-shrink-0 text-xl font-bold hover:text-[#e10600] transition"
          >
            Marketplace
          </Link>

          {/* Search Bar - Hidden on Mobile */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md items-center bg-white/5 border border-white/10 rounded-lg px-4 py-2 hover:border-white/20 transition"
          >
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => navigate("/search/image")}
              className="ml-2 p-1 text-gray-400 hover:text-[#e10600] transition"
              aria-label="Image search"
            >
              <Camera size={18} />
            </button>
          </form>

          {/* Desktop Nav - Hidden on Mobile */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Heart Icon */}
            <Link
              to="/liked"
              className="relative text-gray-300 hover:text-[#e10600] transition"
              aria-label="Liked items"
            >
              <Heart size={20} />
              {likeCount > 0 && (
                <div className="absolute -top-2 -right-2 flex items-center justify-center w-[18px] h-[18px] bg-[#e10600] text-white text-xs font-bold rounded-full">
                  {likeCount > 99 ? "99+" : likeCount}
                </div>
              )}
            </Link>

            {/* Shopping Cart Icon */}
            <Link
              to="/cart"
              className="relative text-gray-300 hover:text-[#e10600] transition"
              aria-label="Shopping cart"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <div className="absolute -top-2 -right-2 flex items-center justify-center w-[18px] h-[18px] bg-[#e10600] text-white text-xs font-bold rounded-full">
                  {cartCount > 99 ? "99+" : cartCount}
                </div>
              )}
            </Link>

            {/* User Section */}
            {!user ? (
              <Link
                to="/login"
                className="text-gray-300 hover:text-[#e10600] transition font-medium"
              >
                Sign in
              </Link>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 text-gray-300 hover:text-[#e10600] transition"
                >
                  <User size={20} />
                  <ChevronDown size={16} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl py-2">
                    <div className="px-4 py-2 text-sm text-gray-400 border-b border-white/10">
                      {user.email}
                    </div>
                    <Link
                      to="/sell"
                      className="block px-4 py-2 text-sm text-white hover:bg-white/5 hover:text-[#e10600] transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Sell
                    </Link>
                    <Link
                      to={`/profile/${user.id}`}
                      className="block px-4 py-2 text-sm text-white hover:bg-white/5 hover:text-[#e10600] transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 hover:text-[#e10600] transition flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-[#e10600] transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-4">
            {/* Mobile Search */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-white/5 border border-white/10 rounded-lg px-4 py-2"
            >
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  navigate("/search/image");
                  setMobileMenuOpen(false);
                }}
                className="ml-2 p-1 text-gray-400 hover:text-[#e10600] transition"
                aria-label="Image search"
              >
                <Camera size={18} />
              </button>
            </form>

            {/* Mobile Nav Links */}
            <Link
              to="/liked"
              className="relative flex items-center gap-2 text-gray-300 hover:text-[#e10600] transition py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Heart size={20} />
              {likeCount > 0 && (
                <div className="flex items-center justify-center w-[18px] h-[18px] bg-[#e10600] text-white text-xs font-bold rounded-full">
                  {likeCount > 99 ? "99+" : likeCount}
                </div>
              )}
              <span>Liked items</span>
            </Link>

            <Link
              to="/cart"
              className="relative flex items-center gap-2 text-gray-300 hover:text-[#e10600] transition py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <div className="flex items-center justify-center w-[18px] h-[18px] bg-[#e10600] text-white text-xs font-bold rounded-full">
                  {cartCount > 99 ? "99+" : cartCount}
                </div>
              )}
              <span>Cart</span>
            </Link>

            {!user ? (
              <Link
                to="/login"
                className="block text-gray-300 hover:text-[#e10600] transition font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            ) : (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-sm text-gray-400 px-0 py-2">
                  {user.email}
                </div>
                <Link
                  to="/sell"
                  className="block text-gray-300 hover:text-[#e10600] transition py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sell
                </Link>
                <Link
                  to={`/profile/${user.id}`}
                  className="block text-gray-300 hover:text-[#e10600] transition py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left text-gray-300 hover:text-[#e10600] transition py-2 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
