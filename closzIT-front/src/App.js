import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import UserProfileSetup1 from './pages/UserProfileSetup/UserProfileSetup1';
import UserProfileSetup2 from './pages/UserProfileSetup/UserProfileSetup2';
import MainPage from './pages/Main/MainPage';
import RegisterPage from './pages/Register/RegisterPage';
import LabelingPage from './pages/Labeling/LabelingPage';
import FittingPage from './pages/Fitting/FittingPage';
import VirtualFittingTest from './pages/Fitting/VirtualFittingTest';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup/profile1" element={<UserProfileSetup1 />} />
        <Route path="/setup/profile2" element={<UserProfileSetup2 />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/labeling" element={<LabelingPage />} />
        <Route path="/fitting" element={<FittingPage />} />
        <Route path="/virtual-fitting-test" element={<VirtualFittingTest />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
