import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h1>Chargement en cours...</h1>
    </div>
  );
};

export default LoadingScreen;