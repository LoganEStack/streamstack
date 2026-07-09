import { useParams } from 'react-router-dom';
import { uploadMasterPlaylistUrl, fetchUploadManifestText } from '../api';
import WatchPage from './WatchPage';

export default function UploadWatchPage() {
  const { token } = useParams();

  return (
    <WatchPage
      src={uploadMasterPlaylistUrl(token)}
      title="Uploaded Video"
      description="Your upload has been transcoded through the HLS pipeline."
      onReadManifest={() => fetchUploadManifestText(token)}
    />
  );
}