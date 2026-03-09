// Storage utility to mock backend using localStorage

export const getJobs = () => {
    const jobs = localStorage.getItem("jobs");
    return jobs ? JSON.parse(jobs) : [
        { id: "1", company: "TechCorp", title: "Frontend Developer", skills: "React, Tailwind, JS", deadline: "2026-03-10", active: true },
        { id: "2", company: "DataSync", title: "Data Scientist", skills: "Python, SQL, ML", deadline: "2026-04-01", active: true },
        { id: "3", company: "CloudNet", title: "DevOps Engineer", skills: "AWS, Docker, CI/CD", deadline: "2026-03-15", active: true },
        { id: "4", company: "DesignPro", title: "UX Designer", skills: "Figma, User Research", deadline: "2026-03-05", active: true },
        { id: "5", company: "InnovateApp", title: "Backend Engineer", skills: "Node.js, Express, MongoDB", deadline: "2026-04-10", active: true },
    ];
};

export const saveJob = (job) => {
    const jobs = getJobs();
    const newJob = { ...job, id: Date.now().toString(), active: true, company: job.company || "Default Company" };
    localStorage.setItem("jobs", JSON.stringify([...jobs, newJob]));
    return newJob;
};

export const getApplications = () => {
    const apps = localStorage.getItem("applications");
    return apps ? JSON.parse(apps) : [];
};

export const applyForJob = (jobId, resumeName, userId) => {
    const apps = getApplications();
    const newApp = { id: Date.now().toString(), jobId, resumeName, userId, dateApplied: new Date().toISOString() };
    localStorage.setItem("applications", JSON.stringify([...apps, newApp]));
    return newApp;
};

// Mock Resume Storage
export const getUserResumes = () => {
    const res = localStorage.getItem("user_resumes");
    return res ? JSON.parse(res) : [];
};

export const saveUserResume = (name) => {
    const res = getUserResumes();
    const updated = [...res, { id: Date.now().toString(), name }];
    localStorage.setItem("user_resumes", JSON.stringify(updated));
    return updated;
};

export const deleteUserResume = (id) => {
    const res = getUserResumes();
    const updated = res.filter(r => r.id !== id);
    localStorage.setItem("user_resumes", JSON.stringify(updated));
    return updated;
};

// Mock AI Engine
import { getApplicationsByUser } from "../services/applicationService";
import { getActivePostings } from "../services/postingService";

export const getAiJobMatches = async (resumeName, userId) => {
    // fetch active jobs from Firestore
    const allJobs = await getActivePostings();
    
    // Get user's applications
    const userApps = await getApplicationsByUser(userId);
    const userAppliedJobIds = userApps
        .map(app => app.jobId);
    
    // Filter out jobs user has already applied to
    const availableJobs = allJobs.filter(job => !userAppliedJobIds.includes(job.id));
    
    // simulate AI by random sort and pick top 10
    return availableJobs
        .sort(() => 0.5 - Math.random())
        .slice(0, 10);
};
