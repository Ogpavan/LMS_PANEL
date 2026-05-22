import { prisma } from "@/server/prisma";

export const supportEnquiryModel = (prisma as typeof prisma & {
  supportEnquiry: any;
}).supportEnquiry;

export const supportFeedbackModel = (prisma as typeof prisma & {
  supportFeedback: any;
}).supportFeedback;

export const supportTicketModel = (prisma as typeof prisma & {
  supportTicket: any;
}).supportTicket;
