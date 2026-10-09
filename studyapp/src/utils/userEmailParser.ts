export type UserRoleType =
  | "admin"
  | "teacher"
  | "student"
  | "hostel_manager"
  | "mess_manager"
  | "fee_manager"
  | "notice_manager";

export interface ParsedUserInfo {
  fullName: string;
  role: UserRoleType;
  emailPrefix: string;
}

/**
 * Extracts the user's name and role from their email formatted as `name.role@gmail.com`.
 * e.g.:
 *  ganesh.student@gmail.com -> { fullName: "Ganesh", role: "student" }
 *  priya.teacher@gmail.com -> { fullName: "Priya", role: "teacher" }
 *  ritesh.fee@gmail.com -> { fullName: "Ritesh", role: "fee_manager" }
 *  rahul.hostel@gmail.com -> { fullName: "Rahul", role: "hostel_manager" }
 *  manish.mess@gmail.com -> { fullName: "Manish", role: "mess_manager" }
 *  admin.admin@gmail.com -> { fullName: "Admin", role: "admin" }
 *  rahul.kumar.student@gmail.com -> { fullName: "Rahul Kumar", role: "student" }
 */
export function parseNameAndRoleFromEmail(email: string | null | undefined): ParsedUserInfo {
  if (!email || typeof email !== "string") {
    return {
      fullName: "User",
      role: "student",
      emailPrefix: "",
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const prefix = cleanEmail.split("@")[0] || "";
  const dotParts = prefix.split(".");

  let detectedRole: UserRoleType = "student";
  let nameParts: string[] = [];

  const roleKeywords: Record<string, UserRoleType> = {
    admin: "admin",
    administrator: "admin",
    teacher: "teacher",
    faculty: "teacher",
    prof: "teacher",
    professor: "teacher",
    fee: "fee_manager",
    fees: "fee_manager",
    feemanager: "fee_manager",
    finance: "fee_manager",
    hostel: "hostel_manager",
    hostelmanager: "hostel_manager",
    warden: "hostel_manager",
    mess: "mess_manager",
    messmanager: "mess_manager",
    canteen: "mess_manager",
    notice: "notice_manager",
    notices: "notice_manager",
    student: "student",
  };

  if (dotParts.length >= 2) {
    const lastPart = dotParts[dotParts.length - 1].toLowerCase();
    if (roleKeywords[lastPart]) {
      detectedRole = roleKeywords[lastPart];
      nameParts = dotParts.slice(0, -1);
    } else {
      nameParts = dotParts;
      for (const [kw, r] of Object.entries(roleKeywords)) {
        if (cleanEmail.includes(kw)) {
          detectedRole = r;
          break;
        }
      }
    }
  } else {
    nameParts = dotParts;
    for (const [kw, r] of Object.entries(roleKeywords)) {
      if (cleanEmail.includes(kw)) {
        detectedRole = r;
        break;
      }
    }
  }

  // Format the name: capitalize each part, replace _ or - with spaces
  const rawJoinedName = nameParts.join(" ").replace(/[_-]/g, " ").trim();
  const words = rawJoinedName.split(/\s+/).filter(Boolean);

  let formattedName = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  if (!formattedName) {
    if (detectedRole === "teacher") formattedName = "Teacher";
    else if (detectedRole === "fee_manager") formattedName = "Fees Manager";
    else if (detectedRole === "hostel_manager") formattedName = "Hostel Manager";
    else if (detectedRole === "mess_manager") formattedName = "Mess Manager";
    else if (detectedRole === "admin") formattedName = "Administrator";
    else formattedName = "Student";
  }

  return {
    fullName: formattedName,
    role: detectedRole,
    emailPrefix: prefix,
  };
}
