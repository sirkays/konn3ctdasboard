import React, { useState } from "react";

import {
  NotificationsSection,
  ProfileSection,
  SecuritySection,
  SessionsSection,
} from "./components/AccountSections";
import AppearanceSection from "./components/AppearanceSection";
import SettingsNavigation from "./components/SettingsNavigation";
// Temporarily disabled: public profile preview.
// import ViewProfile from "../view-profile/ViewProfile";

const Settings = () => {
  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account preferences.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,2fr)]">
        <SettingsNavigation
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <div>
          {activeSection === "profile" && <ProfileSection />}
          {/* {activeSection === "view-profile" && <ViewProfile embedded />} */}
          {activeSection === "security" && <SecuritySection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "appearance" && <AppearanceSection />}
          {activeSection === "sessions" && <SessionsSection />}
        </div>
      </div>
    </div>
  );
};

export default Settings;
