import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MissionControlPage } from '../pages/MissionControlPage';
import { LoadingScreen } from '../components/common/LoadingScreen';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>{loading ? <LoadingScreen /> : null}</AnimatePresence>
      {!loading ? <MissionControlPage /> : null}
    </>
  );
}
