import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Ionicons } from "@expo/vector-icons";

export type SubjectItem = {
  id: string;
  name: string;
  code: string;
  credits?: number;
  type: "core" | "optional";
  defaultTeacher?: string;
  description?: string;
};

export type Branch = {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  coreSubjects: SubjectItem[];
  optionalSubjects: SubjectItem[];
};

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: "cse",
    name: "Computer Science & Engineering",
    code: "CSE",
    description: "Software, AI, Data Science, Web Development",
    icon: "desktop-outline",
    iconBg: "#2563EB",
    coreSubjects: [
      {
        id: "cs-c1",
        name: "Data Structures & Algorithms",
        code: "CS201",
        credits: 4,
        type: "core",
        defaultTeacher: "Dr. S. Ramesh",
        description: "Arrays, Trees, Graphs, Sorting & Complexity Analysis",
      },
      {
        id: "cs-c2",
        name: "Database Management Systems",
        code: "CS204",
        credits: 4,
        type: "core",
        defaultTeacher: "Prof. L. Prasad",
        description: "SQL, Relational Algebra, Normalization & Transactions",
      },
      {
        id: "cs-c3",
        name: "Operating Systems",
        code: "CS205",
        credits: 3,
        type: "core",
        defaultTeacher: "Dr. K. Sushma",
        description: "Processes, Memory Management, File Systems & Concurrency",
      },
      {
        id: "cs-c4",
        name: "Computer Networks",
        code: "CS208",
        credits: 3,
        type: "core",
        defaultTeacher: "Prof. A. Sharma",
        description: "OSI Layers, TCP/IP, Routing Protocols & Sockets",
      },
    ],
    optionalSubjects: [
      {
        id: "cs-o1",
        name: "Artificial Intelligence & ML",
        code: "CS310",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. K. Sushma",
        description: "Supervised Learning, Neural Networks & Deep Learning",
      },
      {
        id: "cs-o2",
        name: "Cloud Computing & DevOps",
        code: "CS312",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. L. Prasad",
        description: "AWS, Docker, Kubernetes & CI/CD Pipelines",
      },
      {
        id: "cs-o3",
        name: "Cyber Security & Cryptography",
        code: "CS314",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. S. Ramesh",
        description: "Network Defense, RSA, Ethical Hacking & Security Audits",
      },
      {
        id: "cs-o4",
        name: "Mobile App Development",
        code: "CS316",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. G. Verma",
        description: "React Native, Flutter, State Management & Native APIs",
      },
      {
        id: "cs-o5",
        name: "Full Stack Web Development",
        code: "CS318",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. R. Nair",
        description: "Node.js, Next.js, REST APIs, Microservices & GraphQL",
      },
      {
        id: "cs-o6",
        name: "Big Data & Data Analytics",
        code: "CS320",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. P. Iyer",
        description: "Apache Spark, Hadoop, Data Pipelines & PowerBI",
      },
    ],
  },
  {
    id: "me",
    name: "Mechanical Engineering",
    code: "ME",
    description: "Design, Manufacturing, Automation",
    icon: "settings-outline",
    iconBg: "#8B5CF6",
    coreSubjects: [
      {
        id: "me-c1",
        name: "Thermodynamics & Heat Transfer",
        code: "ME201",
        credits: 4,
        type: "core",
        defaultTeacher: "Dr. Rajesh K.",
        description: "Laws of Thermodynamics, Steam Cycles & Heat Exchangers",
      },
      {
        id: "me-c2",
        name: "Fluid Mechanics & Hydraulics",
        code: "ME203",
        credits: 4,
        type: "core",
        defaultTeacher: "Prof. V. Mohan",
        description: "Bernoulli, Flow Dynamics, Turbines & Hydraulic Pumps",
      },
      {
        id: "me-c3",
        name: "Strength of Materials",
        code: "ME205",
        credits: 3,
        type: "core",
        defaultTeacher: "Dr. P. Joshi",
        description: "Stress, Strain, Bending Moments, Torsion & Deflection",
      },
      {
        id: "me-c4",
        name: "Manufacturing Technology",
        code: "ME207",
        credits: 3,
        type: "core",
        defaultTeacher: "Prof. S. Rao",
        description: "Machining, Casting, Welding, Metrology & CNC Tools",
      },
    ],
    optionalSubjects: [
      {
        id: "me-o1",
        name: "Robotics & Industrial Automation",
        code: "ME310",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. Rajesh K.",
        description: "Kinematics, PLC Programming, Sensors & Actuators",
      },
      {
        id: "me-o2",
        name: "Automobile Engineering & EV",
        code: "ME312",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. V. Mohan",
        description: "Chassis, Transmission, EV Battery Systems & Powertrain",
      },
      {
        id: "me-o3",
        name: "Computational Fluid Dynamics",
        code: "ME314",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. P. Joshi",
        description: "ANSYS, Finite Volume Methods & Aerodynamic Modeling",
      },
      {
        id: "me-o4",
        name: "Renewable Energy Systems",
        code: "ME316",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. S. Rao",
        description: "Solar Thermal, Wind Turbines & Biomass Gasification",
      },
    ],
  },
  {
    id: "eee",
    name: "Electrical & Electronics Engineering",
    code: "EEE",
    description: "Power Systems, Electronics, Control Systems",
    icon: "flash-outline",
    iconBg: "#10B981",
    coreSubjects: [
      {
        id: "ee-c1",
        name: "Circuit Theory & Network Analysis",
        code: "EE201",
        credits: 4,
        type: "core",
        defaultTeacher: "Prof. A. Venkatesh",
        description: "Kirchhoff, Theorems, Two-Port Networks & Resonance",
      },
      {
        id: "ee-c2",
        name: "Analog & Digital Electronics",
        code: "EE203",
        credits: 4,
        type: "core",
        defaultTeacher: "Dr. M. Swaminathan",
        description: "Op-Amps, Oscillators, Logic Gates & Microcontrollers",
      },
      {
        id: "ee-c3",
        name: "Power Systems & Transmission",
        code: "EE205",
        credits: 3,
        type: "core",
        defaultTeacher: "Prof. N. Reddy",
        description: "Substations, Grid Protection, Load Flow & Faults",
      },
      {
        id: "ee-c4",
        name: "Control Systems Engineering",
        code: "EE207",
        credits: 3,
        type: "core",
        defaultTeacher: "Dr. H. Bose",
        description: "Root Locus, Bode Plots, PID Controllers & State Space",
      },
    ],
    optionalSubjects: [
      {
        id: "ee-o1",
        name: "Embedded Systems & IoT",
        code: "EE310",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. A. Venkatesh",
        description: "ARM Cortex, ESP32, MQTT Protocol & Smart Sensors",
      },
      {
        id: "ee-o2",
        name: "Smart Grid & SCADA Technology",
        code: "EE312",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. N. Reddy",
        description: "Advanced Metering, Substation Automation & Microgrids",
      },
      {
        id: "ee-o3",
        name: "Electric Vehicle Drives",
        code: "EE314",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. M. Swaminathan",
        description: "BLDC Motors, Inverters, Regenerative Braking & BMS",
      },
      {
        id: "ee-o4",
        name: "VLSI Design & Embedded Hardware",
        code: "EE316",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. H. Bose",
        description: "Verilog HDL, FPGA Synthesis & CMOS Fabrication",
      },
    ],
  },
  {
    id: "civil",
    name: "Civil Engineering",
    code: "CIVIL",
    description: "Structures, Infrastructure, Construction",
    icon: "business-outline",
    iconBg: "#F59E0B",
    coreSubjects: [
      {
        id: "ce-c1",
        name: "Structural Analysis & Design",
        code: "CE201",
        credits: 4,
        type: "core",
        defaultTeacher: "Dr. B. K. Mishra",
        description: "Trusses, Indeterminate Beams, Moment Distribution & RCC",
      },
      {
        id: "ce-c2",
        name: "Geotechnical & Soil Mechanics",
        code: "CE203",
        credits: 4,
        type: "core",
        defaultTeacher: "Prof. S. Gupta",
        description: "Soil Bearing Capacity, Settlement, Slopes & Foundations",
      },
      {
        id: "ce-c3",
        name: "Transportation & Highway Engg",
        code: "CE205",
        credits: 3,
        type: "core",
        defaultTeacher: "Dr. R. Pillai",
        description: "Pavement Design, Traffic Engineering & Highway Geometric",
      },
      {
        id: "ce-c4",
        name: "Environmental & Water Supply",
        code: "CE207",
        credits: 3,
        type: "core",
        defaultTeacher: "Prof. M. Das",
        description: "Water Treatment, Wastewater Management & Pollution Control",
      },
    ],
    optionalSubjects: [
      {
        id: "ce-o1",
        name: "Earthquake Resistant Design",
        code: "CE310",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. B. K. Mishra",
        description: "Seismic Loads, Base Isolation & Response Spectrum Analysis",
      },
      {
        id: "ce-o2",
        name: "GIS & Remote Sensing",
        code: "CE312",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. S. Gupta",
        description: "Satellite Imagery, Spatial Analysis & Cartography Tools",
      },
      {
        id: "ce-o3",
        name: "Urban Planning & Smart Cities",
        code: "CE314",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. R. Pillai",
        description: "Zoning, Mass Transit Integration & Sustainable Infra",
      },
      {
        id: "ce-o4",
        name: "Construction Project Management",
        code: "CE316",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. M. Das",
        description: "CPM / PERT, Cost Estimation, BIM & Safety Regulations",
      },
    ],
  },
  {
    id: "it",
    name: "Information Technology",
    code: "IT",
    description: "Networking, Systems, Software",
    icon: "flask-outline",
    iconBg: "#EF4444",
    coreSubjects: [
      {
        id: "it-c1",
        name: "Web Technologies & Protocols",
        code: "IT201",
        credits: 4,
        type: "core",
        defaultTeacher: "Prof. D. Mukherjee",
        description: "HTTP/3, WebSockets, HTML5, CSS Grid & JavaScript Engine",
      },
      {
        id: "it-c2",
        name: "Software Engineering & Agile",
        code: "IT203",
        credits: 4,
        type: "core",
        defaultTeacher: "Dr. N. Choudhary",
        description: "Scrum, System Design, Testing & Design Patterns",
      },
      {
        id: "it-c3",
        name: "Information Security & Cryptography",
        code: "IT205",
        credits: 3,
        type: "core",
        defaultTeacher: "Prof. S. Sen",
        description: "Firewalls, Intrusion Detection, AES & PKI Systems",
      },
      {
        id: "it-c4",
        name: "Computer Systems Architecture",
        code: "IT207",
        credits: 3,
        type: "core",
        defaultTeacher: "Dr. V. Roy",
        description: "Instruction Sets, Pipelining, Caches & Multi-Core",
      },
    ],
    optionalSubjects: [
      {
        id: "it-o1",
        name: "Blockchain & Decentralized Apps",
        code: "IT310",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. D. Mukherjee",
        description: "Smart Contracts, Ethereum, Solidity & Web3 Security",
      },
      {
        id: "it-o2",
        name: "Natural Language Processing",
        code: "IT312",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. N. Choudhary",
        description: "LLMs, Sentiment Analysis, Transformers & BERT",
      },
      {
        id: "it-o3",
        name: "Network Forensics & Incident Response",
        code: "IT314",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. S. Sen",
        description: "Wireshark Packet Analysis, Memory Dumps & Log Auditing",
      },
      {
        id: "it-o4",
        name: "Distributed Computing & Microservices",
        code: "IT316",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. V. Roy",
        description: "Consensus Algorithms, Kafka, Redis & gRPC",
      },
    ],
  },
  {
    id: "chem",
    name: "Chemical Engineering",
    code: "CHEM",
    description: "Process, Materials, Energy",
    icon: "color-fill-outline",
    iconBg: "#06B6D4",
    coreSubjects: [
      {
        id: "ch-c1",
        name: "Chemical Reaction Engineering",
        code: "CH201",
        credits: 4,
        type: "core",
        defaultTeacher: "Dr. K. Subramanian",
        description: "Batch Reactors, CSTR, Catalysis & Reaction Kinetics",
      },
      {
        id: "ch-c2",
        name: "Mass Transfer Operations",
        code: "CH203",
        credits: 4,
        type: "core",
        defaultTeacher: "Prof. A. Bhattacharya",
        description: "Distillation Columns, Gas Absorption, Extraction & Drying",
      },
      {
        id: "ch-c3",
        name: "Heat Transfer Operations",
        code: "CH205",
        credits: 3,
        type: "core",
        defaultTeacher: "Dr. S. Kulkarni",
        description: "Conduction, Convection, Radiation & Evaporator Design",
      },
      {
        id: "ch-c4",
        name: "Chemical Engg Thermodynamics",
        code: "CH207",
        credits: 3,
        type: "core",
        defaultTeacher: "Prof. R. Mehta",
        description: "Phase Equilibria, Fugacity, Solution Thermodynamics",
      },
    ],
    optionalSubjects: [
      {
        id: "ch-o1",
        name: "Petroleum Refining Engineering",
        code: "CH310",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. K. Subramanian",
        description: "Crude Assay, Catalytic Cracking, Hydrotreating & Blending",
      },
      {
        id: "ch-o2",
        name: "Biochemical & Bioprocess Engg",
        code: "CH312",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. A. Bhattacharya",
        description: "Fermenters, Enzyme Kinetics, Bioseparations & Sterilization",
      },
      {
        id: "ch-o3",
        name: "Polymer Science & Technology",
        code: "CH314",
        credits: 3,
        type: "optional",
        defaultTeacher: "Dr. S. Kulkarni",
        description: "Polymerization, Rheology, Injection Molding & Composites",
      },
      {
        id: "ch-o4",
        name: "Nanotechnology & Advanced Materials",
        code: "CH316",
        credits: 3,
        type: "optional",
        defaultTeacher: "Prof. R. Mehta",
        description: "Nanoparticles Synthesis, Characterization & Nano-Catalysts",
      },
    ],
  },
];

/**
 * Real-time listener for branches collection in Firestore
 */
export function listenBranches(callback: (branches: Branch[]) => void): () => void {
  const branchesCol = collection(db, "branches");
  return onSnapshot(
    branchesCol,
    (snapshot) => {
      if (snapshot.empty) {
        callback(DEFAULT_BRANCHES);
      } else {
        const loaded: Branch[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Branch, "id">),
        }));
        callback(loaded);
      }
    },
    (err) => {
      console.warn("Branches listener warning:", err);
      callback(DEFAULT_BRANCHES);
    }
  );
}

/**
 * Seed or reset default branches to Firestore
 */
export async function seedBranchesToFirestore(): Promise<void> {
  for (const b of DEFAULT_BRANCHES) {
    const branchRef = doc(db, "branches", b.id);
    await setDoc(branchRef, {
      name: b.name,
      code: b.code,
      description: b.description,
      icon: b.icon,
      iconBg: b.iconBg,
      coreSubjects: b.coreSubjects,
      optionalSubjects: b.optionalSubjects,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

/**
 * Update a specific branch in Firestore
 */
export async function updateBranchInFirestore(branchId: string, data: Partial<Branch>): Promise<void> {
  const branchRef = doc(db, "branches", branchId);
  await setDoc(branchRef, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Save user's selected branch, subjects, and teachers to Firestore
 */
export async function saveUserCurriculum(
  userId: string,
  branch: Branch,
  selectedSubjects: {
    name: string;
    code: string;
    type: "core" | "optional";
    teacherName: string;
    credits?: number;
  }[]
): Promise<void> {
  // 1. Update user profile document
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      branch: branch.name,
      department: branch.name,
      branchCode: branch.code,
      selectedBranchId: branch.id,
      selectedSubjects: selectedSubjects,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // 2. Also populate the users/{uid}/subjects collection so existing screens work seamlessly
  const existingSubjectsSnap = await getDocs(collection(db, "users", userId, "subjects"));
  const existingMap = new Map<string, string>();
  existingSubjectsSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.name) existingMap.set(data.name.toLowerCase(), d.id);
  });

  for (const s of selectedSubjects) {
    const existingId = existingMap.get(s.name.toLowerCase());
    if (existingId) {
      await updateDoc(doc(db, "users", userId, "subjects", existingId), {
        name: s.name,
        teacherName: s.teacherName,
        code: s.code,
        type: s.type,
        credits: s.credits || 3,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "users", userId, "subjects"), {
        name: s.name,
        teacherName: s.teacherName,
        code: s.code,
        type: s.type,
        credits: s.credits || 3,
        totalClasses: 0,
        attendedClasses: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
}
