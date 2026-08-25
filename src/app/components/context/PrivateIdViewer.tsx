import { useEffect, useState } from 'react';
import { useAquaReg } from '../context/AquaRegCONTEXT'; // Adjust path to your context file

interface PrivateIdViewerProps {
  filePath: string | null;
  bucketName?: string; // Optional: defaults to 'id-scans'
  className?: string;  // Optional: customize styling per placement
}

export const PrivateIdViewer = ({ 
  filePath, 
  bucketName = 'id-scans',
  className = "w-full h-48 object-cover rounded-xl border-2 border-zinc-700 shadow-md"
}: PrivateIdViewerProps) => {
  const { supabase } = useAquaReg();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPrivateImage() {
      if (!filePath) {
        setLoading(false);
        return;
      }

      // Generate a temporary 15-minute signed URL
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 900);

      if (!error && data?.signedUrl && mounted) {
        setImageUrl(data.signedUrl);
      }
      setLoading(false);
    }

    loadPrivateImage();

    return () => { mounted = false; };
  }, [filePath, bucketName, supabase]);

  if (loading) return <div className="text-xs text-slate-400 p-2">Loading secure ID...</div>;
  if (!imageUrl) return <div className="text-xs text-red-400 p-2">No valid ID image found.</div>;

  return (
    <img 
      src={imageUrl} 
      alt="Municipal ID Scan" 
      className={className}
    />
  );
};