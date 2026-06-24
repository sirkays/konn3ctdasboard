import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import EventDashboard from "./EventDashboard";
import CreateEvents from "./CreateEvents";
import EventParticipants from "./EventParticipants";
import EventDetail from "./eventDetail";

const Events = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <Routes>
        {/* Default route: event dashboard */}
        <Route path="/" element={<EventDashboard />} />

        {/* Create event form */}
        <Route
          path="create"
          element={<CreateEvents onClose={() => navigate("/events")} />}
        />

        {/* Participant route */}
        <Route
          path="participants/:reference"
          element={<EventParticipants />}
        />

        {/* Event detail route */}
        <Route path="detail/:reference" element={<EventDetail />} />
      </Routes>
    </div>
  );
};

export default Events;
