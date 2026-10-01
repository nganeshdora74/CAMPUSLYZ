import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface Announcement_Key {
  id: UUIDString;
  __typename?: 'Announcement_Key';
}

export interface Course_Key {
  id: UUIDString;
  __typename?: 'Course_Key';
}

export interface CreateCourseData {
  course_insert: Course_Key;
}

export interface CreateCourseVariables {
  courseCode: string;
  title: string;
  instructorName: string;
}

export interface CreateNotificationData {
  notification_insert: Notification_Key;
}

export interface CreateNotificationVariables {
  userId: UUIDString;
  message: string;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface DeleteAnnouncementData {
  announcement_delete?: Announcement_Key | null;
}

export interface DeleteAnnouncementVariables {
  id: UUIDString;
}

export interface DeleteCourseData {
  course_delete?: Course_Key | null;
}

export interface DeleteCourseVariables {
  id: UUIDString;
}

export interface DeleteNotificationData {
  notification_delete?: Notification_Key | null;
}

export interface DeleteNotificationVariables {
  id: UUIDString;
}

export interface DeleteUserData {
  user_delete?: User_Key | null;
}

export interface DropCourseData {
  enrollment_delete?: Enrollment_Key | null;
}

export interface DropCourseVariables {
  id: UUIDString;
}

export interface EnrollInCourseData {
  enrollment_insert: Enrollment_Key;
}

export interface EnrollInCourseVariables {
  courseId: UUIDString;
  semester: string;
}

export interface Enrollment_Key {
  id: UUIDString;
  __typename?: 'Enrollment_Key';
}

export interface GetAnnouncementData {
  announcement?: {
    title: string;
    content: string;
  };
}

export interface GetAnnouncementVariables {
  id: UUIDString;
}

export interface GetCourseData {
  course?: {
    title: string;
    instructorName: string;
  };
}

export interface GetCourseVariables {
  id: UUIDString;
}

export interface GetCurrentUserData {
  user?: {
    email: string;
    name: string;
    role: string;
  };
}

export interface GetEnrollmentData {
  enrollment?: {
    semester: string;
    grade?: string | null;
    course: {
      title: string;
    };
  };
}

export interface GetEnrollmentVariables {
  id: UUIDString;
}

export interface GetNotificationData {
  notification?: {
    message: string;
    isRead: boolean;
  };
}

export interface GetNotificationVariables {
  id: UUIDString;
}

export interface ListAnnouncementsData {
  announcements: ({
    title: string;
    createdAt: TimestampString;
  })[];
}

export interface ListCoursesData {
  courses: ({
    courseCode: string;
    title: string;
  })[];
}

export interface ListMyEnrollmentsData {
  enrollments: ({
    semester: string;
    course: {
      title: string;
    };
  })[];
}

export interface ListMyNotificationsData {
  notifications: ({
    message: string;
    createdAt: TimestampString;
  })[];
}

export interface ListUsersData {
  users: ({
    name: string;
    email: string;
  })[];
}

export interface MarkNotificationReadData {
  notification_update?: Notification_Key | null;
}

export interface MarkNotificationReadVariables {
  id: UUIDString;
}

export interface Notification_Key {
  id: UUIDString;
  __typename?: 'Notification_Key';
}

export interface PostAnnouncementData {
  announcement_insert: Announcement_Key;
}

export interface PostAnnouncementVariables {
  title: string;
  content: string;
}

export interface UpdateAnnouncementData {
  announcement_update?: Announcement_Key | null;
}

export interface UpdateAnnouncementVariables {
  id: UUIDString;
  content: string;
}

export interface UpdateCourseData {
  course_update?: Course_Key | null;
}

export interface UpdateCourseVariables {
  id: UUIDString;
  description?: string | null;
}

export interface UpdateEnrollmentGradeData {
  enrollment_update?: Enrollment_Key | null;
}

export interface UpdateEnrollmentGradeVariables {
  id: UUIDString;
  grade: string;
}

export interface UpdateUserData {
  user_update?: User_Key | null;
}

export interface UpdateUserVariables {
  name: string;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to execute without passing in DataConnect. */
export function createUser(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;
/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function createUser(options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateUser' Mutation. Allow users to execute without passing in DataConnect. */
export function updateUser(dc: DataConnect, vars: UpdateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateUserData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateUser(vars: UpdateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateUserData>>;

/** Generated Node Admin SDK operation action function for the 'GetCurrentUser' Query. Allow users to execute without passing in DataConnect. */
export function getCurrentUser(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCurrentUserData>>;
/** Generated Node Admin SDK operation action function for the 'GetCurrentUser' Query. Allow users to pass in custom DataConnect instances. */
export function getCurrentUser(options?: OperationOptions): Promise<ExecuteOperationResponse<GetCurrentUserData>>;

/** Generated Node Admin SDK operation action function for the 'ListUsers' Query. Allow users to execute without passing in DataConnect. */
export function listUsers(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListUsersData>>;
/** Generated Node Admin SDK operation action function for the 'ListUsers' Query. Allow users to pass in custom DataConnect instances. */
export function listUsers(options?: OperationOptions): Promise<ExecuteOperationResponse<ListUsersData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteUser' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteUser(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteUserData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteUser(options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteUserData>>;

/** Generated Node Admin SDK operation action function for the 'CreateCourse' Mutation. Allow users to execute without passing in DataConnect. */
export function createCourse(dc: DataConnect, vars: CreateCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateCourseData>>;
/** Generated Node Admin SDK operation action function for the 'CreateCourse' Mutation. Allow users to pass in custom DataConnect instances. */
export function createCourse(vars: CreateCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateCourseData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateCourse' Mutation. Allow users to execute without passing in DataConnect. */
export function updateCourse(dc: DataConnect, vars: UpdateCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateCourseData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateCourse' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateCourse(vars: UpdateCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateCourseData>>;

/** Generated Node Admin SDK operation action function for the 'GetCourse' Query. Allow users to execute without passing in DataConnect. */
export function getCourse(dc: DataConnect, vars: GetCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCourseData>>;
/** Generated Node Admin SDK operation action function for the 'GetCourse' Query. Allow users to pass in custom DataConnect instances. */
export function getCourse(vars: GetCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCourseData>>;

/** Generated Node Admin SDK operation action function for the 'ListCourses' Query. Allow users to execute without passing in DataConnect. */
export function listCourses(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListCoursesData>>;
/** Generated Node Admin SDK operation action function for the 'ListCourses' Query. Allow users to pass in custom DataConnect instances. */
export function listCourses(options?: OperationOptions): Promise<ExecuteOperationResponse<ListCoursesData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteCourse' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteCourse(dc: DataConnect, vars: DeleteCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteCourseData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteCourse' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteCourse(vars: DeleteCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteCourseData>>;

/** Generated Node Admin SDK operation action function for the 'EnrollInCourse' Mutation. Allow users to execute without passing in DataConnect. */
export function enrollInCourse(dc: DataConnect, vars: EnrollInCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<EnrollInCourseData>>;
/** Generated Node Admin SDK operation action function for the 'EnrollInCourse' Mutation. Allow users to pass in custom DataConnect instances. */
export function enrollInCourse(vars: EnrollInCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<EnrollInCourseData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateEnrollmentGrade' Mutation. Allow users to execute without passing in DataConnect. */
export function updateEnrollmentGrade(dc: DataConnect, vars: UpdateEnrollmentGradeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateEnrollmentGradeData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateEnrollmentGrade' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateEnrollmentGrade(vars: UpdateEnrollmentGradeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateEnrollmentGradeData>>;

/** Generated Node Admin SDK operation action function for the 'GetEnrollment' Query. Allow users to execute without passing in DataConnect. */
export function getEnrollment(dc: DataConnect, vars: GetEnrollmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetEnrollmentData>>;
/** Generated Node Admin SDK operation action function for the 'GetEnrollment' Query. Allow users to pass in custom DataConnect instances. */
export function getEnrollment(vars: GetEnrollmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetEnrollmentData>>;

/** Generated Node Admin SDK operation action function for the 'ListMyEnrollments' Query. Allow users to execute without passing in DataConnect. */
export function listMyEnrollments(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyEnrollmentsData>>;
/** Generated Node Admin SDK operation action function for the 'ListMyEnrollments' Query. Allow users to pass in custom DataConnect instances. */
export function listMyEnrollments(options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyEnrollmentsData>>;

/** Generated Node Admin SDK operation action function for the 'DropCourse' Mutation. Allow users to execute without passing in DataConnect. */
export function dropCourse(dc: DataConnect, vars: DropCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DropCourseData>>;
/** Generated Node Admin SDK operation action function for the 'DropCourse' Mutation. Allow users to pass in custom DataConnect instances. */
export function dropCourse(vars: DropCourseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DropCourseData>>;

/** Generated Node Admin SDK operation action function for the 'PostAnnouncement' Mutation. Allow users to execute without passing in DataConnect. */
export function postAnnouncement(dc: DataConnect, vars: PostAnnouncementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PostAnnouncementData>>;
/** Generated Node Admin SDK operation action function for the 'PostAnnouncement' Mutation. Allow users to pass in custom DataConnect instances. */
export function postAnnouncement(vars: PostAnnouncementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PostAnnouncementData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateAnnouncement' Mutation. Allow users to execute without passing in DataConnect. */
export function updateAnnouncement(dc: DataConnect, vars: UpdateAnnouncementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateAnnouncementData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateAnnouncement' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateAnnouncement(vars: UpdateAnnouncementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateAnnouncementData>>;

/** Generated Node Admin SDK operation action function for the 'GetAnnouncement' Query. Allow users to execute without passing in DataConnect. */
export function getAnnouncement(dc: DataConnect, vars: GetAnnouncementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetAnnouncementData>>;
/** Generated Node Admin SDK operation action function for the 'GetAnnouncement' Query. Allow users to pass in custom DataConnect instances. */
export function getAnnouncement(vars: GetAnnouncementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetAnnouncementData>>;

/** Generated Node Admin SDK operation action function for the 'ListAnnouncements' Query. Allow users to execute without passing in DataConnect. */
export function listAnnouncements(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAnnouncementsData>>;
/** Generated Node Admin SDK operation action function for the 'ListAnnouncements' Query. Allow users to pass in custom DataConnect instances. */
export function listAnnouncements(options?: OperationOptions): Promise<ExecuteOperationResponse<ListAnnouncementsData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteAnnouncement' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteAnnouncement(dc: DataConnect, vars: DeleteAnnouncementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteAnnouncementData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteAnnouncement' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteAnnouncement(vars: DeleteAnnouncementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteAnnouncementData>>;

/** Generated Node Admin SDK operation action function for the 'CreateNotification' Mutation. Allow users to execute without passing in DataConnect. */
export function createNotification(dc: DataConnect, vars: CreateNotificationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateNotificationData>>;
/** Generated Node Admin SDK operation action function for the 'CreateNotification' Mutation. Allow users to pass in custom DataConnect instances. */
export function createNotification(vars: CreateNotificationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateNotificationData>>;

/** Generated Node Admin SDK operation action function for the 'MarkNotificationRead' Mutation. Allow users to execute without passing in DataConnect. */
export function markNotificationRead(dc: DataConnect, vars: MarkNotificationReadVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<MarkNotificationReadData>>;
/** Generated Node Admin SDK operation action function for the 'MarkNotificationRead' Mutation. Allow users to pass in custom DataConnect instances. */
export function markNotificationRead(vars: MarkNotificationReadVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<MarkNotificationReadData>>;

/** Generated Node Admin SDK operation action function for the 'GetNotification' Query. Allow users to execute without passing in DataConnect. */
export function getNotification(dc: DataConnect, vars: GetNotificationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetNotificationData>>;
/** Generated Node Admin SDK operation action function for the 'GetNotification' Query. Allow users to pass in custom DataConnect instances. */
export function getNotification(vars: GetNotificationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetNotificationData>>;

/** Generated Node Admin SDK operation action function for the 'ListMyNotifications' Query. Allow users to execute without passing in DataConnect. */
export function listMyNotifications(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyNotificationsData>>;
/** Generated Node Admin SDK operation action function for the 'ListMyNotifications' Query. Allow users to pass in custom DataConnect instances. */
export function listMyNotifications(options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyNotificationsData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteNotification' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteNotification(dc: DataConnect, vars: DeleteNotificationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteNotificationData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteNotification' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteNotification(vars: DeleteNotificationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteNotificationData>>;

