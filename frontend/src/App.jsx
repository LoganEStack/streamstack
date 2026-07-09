import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import BrowsePage from './pages/BrowsePage';
import UploadPage from './pages/UploadPage';
import CatalogWatchPage from './pages/CatalogWatchPage';
import UploadWatchPage from './pages/UploadWatchPage';
import NotFoundPage from './pages/NotFoundPage';


export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/v/:publicId" element={<CatalogWatchPage />} />
        <Route path="/upload/:token" element={<UploadWatchPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
