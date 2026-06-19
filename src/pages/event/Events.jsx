import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import EventDashboard from "./EventDashboard";
import EventList from "./EventList";
import CreateEvents from "./CreateEvents";
import EventParticipants from "./EventParticipants";

const Events = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <Routes>
        {/* Default route: event dashboard */}
        <Route path="/" element={<EventDashboard />} />

        {/* Legacy event list */}
        <Route path="list" element={<EventList />} />

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
      </Routes>
    </div>
  );
};

export default Events;
