import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import ScrollThumb from './components/ScrollThumb.jsx';
import Parcels from './pages/caretaker/Parcels.jsx';
import Wall from './pages/caretaker/Wall.jsx';
import DropOff from './pages/courier/DropOff.jsx';
import Collect from './pages/resident/Collect.jsx';
import MyParcels from './pages/resident/MyParcels.jsx';
import Welcome from './pages/Welcome.jsx';

export default function App() {
  const { pathname } = useLocation();
  return (
    <div className="app">
          <Header />
                <ScrollThumb />
      {/* The key restarts the page's entrance animation on every navigation. */}
      <main className="main" key={pathname}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/caretaker" element={<Navigate to="/caretaker/wall" replace />} />
          <Route path="/caretaker/wall" element={<Wall />} />
          <Route path="/caretaker/parcels" element={<Parcels />} />
          {/* an address for one parcel lands on Parcels */}
          <Route path="/caretaker/parcels/:id" element={<Navigate to="/caretaker/parcels" replace />} />
          <Route path="/courier" element={<DropOff />} />
          <Route path="/resident" element={<MyParcels />} />
          <Route path="/resident/collect" element={<Collect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
