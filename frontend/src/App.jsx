import React, { Suspense } from "react";
import "./App.css";
import Entry from "./pages/Entry";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import Listings from "./pages/Listings/Listings";
import {
  QueryClient,
  QueryClientProvider,
} from "react-query";
import { ReactQueryDevtools } from 'react-query/devtools';
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'

function App() {
  const queryClient = new QueryClient();

  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<div>Loading ...</div>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Entry />} />
                {/* Add more nested routes here as needed */}
                <Route path="/listings" element={<Listings />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
        <ToastContainer />
        <ReactQueryDevtools initialIsOpen={false}/>
      </QueryClientProvider>
    </div>
  );
}

export default App;
