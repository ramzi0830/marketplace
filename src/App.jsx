import { Routes, Route, useParams } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Home from "./pages/Home.jsx";
import Sell from "./pages/Sell.jsx";
import ListingDetail from "./pages/ListingDetail.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import Header from "./components/Header.jsx";


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
    <>
      <Header />
      <Routes>
      <Route path="/" element={<Home />} />
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
      <Route path="/listing/:id" element={<ListingDetail />} />
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
            <Sell />
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
    </>
  );
}

export default App;
