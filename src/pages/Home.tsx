import React from 'react';
import Banner from '../components/Banner';
import SystemUsage from '../components/SystemUsage';
import CounselorProfiles from '../components/CounselorProfiles';
import Footer from '../components/Footer';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Banner />
      <SystemUsage />
      <CounselorProfiles />
      <Footer />
    </div>
  );
};

export default Home;
