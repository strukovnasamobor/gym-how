import React from "react";
import { Route, Routes } from "react-router-dom";
import { Box } from "@mui/material";

import "./App.css";
import Navbar from "./components/Navbar";
import ApiLimitBanner from "./components/ApiLimitBanner";
import Home from "./pages/Home";
import ExerciseDetail from "./pages/ExerciseDetail";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Profile from "./components/Profile.jsx";
import PageExercises from "./components/PageExercises";

const App = () => {
  return (
    <Box width="400px" sx={{ width: { xl: "1488px" } }} m="auto">
      <Navbar />
      <ApiLimitBanner />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exercise/:id" element={<ExerciseDetail />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Exercises" element={<PageExercises />} />
      </Routes>
      <Footer />
    </Box>
  );
};

export default App;
