"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import KioskView from "@/components/KioskView";
import GradingView from "@/components/GradingView";
import TrackingView from "@/components/TrackingView";
import AnalyticsView from "@/components/AnalyticsView";
import StudentProfileView from "@/components/StudentProfileView";
import PrintQrSheet from "@/components/PrintQrSheet";
import SettingsView from "@/components/SettingsView";
import NewAssignmentModal from "@/components/NewAssignmentModal";
import PinModal from "@/components/PinModal";
import LoginView from "@/components/LoginView";
import StudentPortal from "@/components/StudentPortal";
import { Student, Assignment, Settings } from "@/lib/types";

export default function Home() {
  const [userRole, setUserRole] = useState<"login" | "teacher" | "student">("login");
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<string>("grade");
  const [isKioskLocked, setIsKioskLocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isNewAsgOpen, setIsNewAsgOpen] = useState<boolean>(false);

  const [settings, setSettings] = useState<Settings>({
    teacher_name: "Cô Linh",
    class_name: "Lớp 3A7",
    teacher_pin: "1234",
    school_name: "Trường Tiểu Học Ánh Dương",
    google_sheet_url: "",
    auto_sync_sheets: "true",
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const loadInitialData = useCallback(async () => {
    try {
      const [resSet, resSt, resAsg] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/students"),
        fetch("/api/assignments"),
      ]);
      if (resSet.ok) setSettings(await resSet.json());
      if (resSt.ok) setStudents(await resSt.json());
      if (resAsg.ok) setAssignments(await resAsg.json());
    } catch (e) {
      console.error("Error loading initial data", e);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Tab switching with PIN protection
  const handleSelectTab = (tabId: string) => {
    if (isKioskLocked && tabId !== "kiosk") {
      setIsPinModalOpen(true);
      return;
    }
    setActiveTab(tabId);
  };

  const handleEnterKiosk = () => {
    setIsKioskLocked(true);
    setActiveTab("kiosk");
  };

  const handleUnlockTeacher = () => {
    setIsPinModalOpen(true);
  };

  const onPinSuccess = () => {
    setIsKioskLocked(false);
    setIsPinModalOpen(false);
  };

  if (userRole === "login") {
    return (
      <LoginView
        students={students}
        settings={settings}
        onTeacherLogin={() => setUserRole("teacher")}
        onStudentLogin={(st) => {
          setCurrentStudent(st);
          setUserRole("student");
        }}
        onEnterKiosk={() => {
          setUserRole("teacher");
          setIsKioskLocked(true);
          setActiveTab("kiosk");
        }}
      />
    );
  }

  if (userRole === "student" && currentStudent) {
    return (
      <StudentPortal
        student={currentStudent}
        settings={settings}
        assignments={assignments}
        onLogout={() => {
          setCurrentStudent(null);
          setUserRole("login");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        settings={settings}
        activeTab={activeTab}
        isKioskLocked={isKioskLocked}
        onSelectTab={handleSelectTab}
        onEnterKiosk={handleEnterKiosk}
        onUnlockTeacher={handleUnlockTeacher}
        onLogout={() => setUserRole("login")}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === "kiosk" && (
          <KioskView
            assignments={assignments}
            students={students}
            onSubmissionSuccess={loadInitialData}
          />
        )}

        {activeTab === "grade" && (
          <GradingView
            assignments={assignments}
            students={students}
            onGradedSuccess={loadInitialData}
            onOpenNewAssignment={() => setIsNewAsgOpen(true)}
          />
        )}

        {activeTab === "tracking" && <TrackingView assignments={assignments} />}

        {activeTab === "analytics" && <AnalyticsView />}

        {activeTab === "students" && <StudentProfileView students={students} />}

        {activeTab === "print" && <PrintQrSheet students={students} settings={settings} />}

        {activeTab === "settings" && <SettingsView settings={settings} onSaved={loadInitialData} />}
      </main>

      {/* Modals */}
      <PinModal
        isOpen={isPinModalOpen}
        correctPin={settings.teacher_pin || "1234"}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={onPinSuccess}
      />

      <NewAssignmentModal
        isOpen={isNewAsgOpen}
        onClose={() => setIsNewAsgOpen(false)}
        onCreated={loadInitialData}
      />
    </div>
  );
}
