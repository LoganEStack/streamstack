import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import BrowsePage from './pages/BrowsePage';
import WatchPage from './pages/WatchPage';
import UploadPage from './pages/UploadPage';

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/v/:publicId" element={<WatchPage />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
    </>
  );
}
