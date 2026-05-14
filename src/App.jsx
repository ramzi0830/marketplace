import { Link, Routes, Route, useParams } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";

function ListingPage() {
  const { id } = useParams();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center text-2xl">
      Listing page: {id}
    </div>
  );
}

function ProfilePage() {
  const { userId } = useParams();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center text-2xl">
      Profile page: {userId}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-3xl rounded-[2rem] border border-red-600/20 bg-white/5 p-10 shadow-[0_0_80px_rgba(225,16,0,0.12)] backdrop-blur-xl">
              <div className="space-y-6 text-center">
                <p className="text-sm uppercase tracking-[0.35em] text-red-500">Marketplace</p>
                <h1 className="text-4xl font-semibold">Welcome to the marketplace</h1>
                <p className="max-w-2xl mx-auto text-slate-300">
                  Log in or sign up to manage your account and browse the latest offers.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <Link
                  to="/login"
                  className="block rounded-3xl border border-red-600/40 bg-red-600/10 px-6 py-6 text-center text-lg font-semibold text-white transition hover:border-red-500 hover:bg-red-600/15"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="block rounded-3xl border border-slate-700/80 bg-slate-950 px-6 py-6 text-center text-lg font-semibold text-slate-100 transition hover:border-red-500 hover:bg-slate-900"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/browse"
        element={
          <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center text-2xl">
            Browse page
          </div>
        }
      />
      <Route path="/listing/:id" element={<ListingPage />} />
      <Route path="/profile/:userId" element={<ProfilePage />} />
      <Route
        path="/search/image"
        element={
          <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center text-2xl">
            Image search page
          </div>
        }
      />
      <Route
        path="/sell"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center text-2xl">
              Sell page (protected)
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cart"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center text-2xl">
              Cart page (protected)
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/liked"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center text-2xl">
              Liked page (protected)
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
