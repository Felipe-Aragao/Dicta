export const ROUTES = {
  login: "/login",
  credentials: (role = ":role") => `/entrar/${role}`,
  visitorName: "/visitante/nome",
  voiceCommands: "/comandos",
  voiceIntro: "/comandos/intro",
  studentHome: "/minha-area",
  professorHome: "/professor",
  upload: "/upload",
  extracting: "/processando-pdf",
  preview: "/preview",
  activityCode: (code = ":code") => `/atividade/codigo/${code}`,
  activityResponder: (activityId = ":activityId") => `/atividade/${activityId}/responder`,
  attemptReview: (attemptId = ":attemptId") => `/tentativa/${attemptId}/revisao`,
  attemptDone: (attemptId = ":attemptId") => `/tentativa/${attemptId}/concluida`,
  attempts: (activityId = ":activityId") => `/tentativas/${activityId}`,
};

export const PENDING_ACTIVITY_CODE_KEY = "dicta.pendingActivityCode";

export const getHomePathForRole = (role) => {
  if (role === "professor") return ROUTES.professorHome;
  if (role === "aluno") return ROUTES.studentHome;
  if (role === "visitante") return ROUTES.upload;
  return ROUTES.login;
};

export const getRoleFromPath = (pathname) => {
  if (pathname.startsWith("/professor")) return "professor";
  if (pathname.startsWith("/minha-area") || pathname.startsWith("/entrar/aluno")) return "aluno";
  if (pathname.startsWith("/visitante") || pathname.startsWith("/upload") || pathname.startsWith("/preview")) return "visitante";
  return null;
};

export const getPageKeyFromPath = (pathname) => {
  if (pathname === ROUTES.login) return "login";
  if (pathname.startsWith("/entrar/")) return "credentials";
  if (pathname === ROUTES.visitorName) return "visitor-name";
  if (pathname === ROUTES.professorHome) return "professor-home";
  if (pathname === ROUTES.studentHome) return "history";
  if (pathname === ROUTES.upload) return "upload";
  if (pathname === ROUTES.extracting) return "extracting";
  if (pathname === ROUTES.preview) return "preview";
  if (pathname === ROUTES.voiceCommands) return "voice-commands";
  if (pathname === ROUTES.voiceIntro) return "voice-commands-intro";
  if (pathname.includes("/responder")) return "question";
  if (pathname.includes("/revisao")) return "review";
  if (pathname.includes("/concluida")) return "done";
  if (pathname.startsWith("/tentativas/")) return "attempts";
  return "login";
};
