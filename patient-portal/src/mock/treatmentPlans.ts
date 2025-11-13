export type TreatmentPlanPhase = {
  title: string;
  description?: string;
  weeks?: string;
};

export type ProcedureAppointment = {
  id: string;
  title: string;
  datetime: string;
};

export type ProcedureInvoice = {
  id: string;
  amount: number;
  status: string;
};

export type TreatmentProcedure = {
  id: string;
  title: string;
  description?: string;
  scheduledDate?: string;
  completedDate?: string;
  status: "completed" | "scheduled" | "planned";
  phase: number;
  tooth?: string;
  price: number;
  discount: number;
  quantity: number;
  appointment?: ProcedureAppointment;
  invoice?: ProcedureInvoice;
};

export type TreatmentPlan = {
  id: string;
  title: string;
  status: "active" | "completed" | "planned";
  steps?: {
    description?: string;
    phases?: TreatmentPlanPhase[];
  };
  procedures: TreatmentProcedure[];
};

export type TreatmentPerson = {
  id: string;
  name: string;
  email: string;
  picture?: string;
};

export const MOCK_TREATMENT_PLANS: TreatmentPlan[] = [
  {
    id: "plan-1",
    title: "Treatments Plan Title",
    status: "active",
    steps: {
      description:
        "The patient presents with early carious lesions on teeth #11 and #13, and moderate structural wear on tooth #12. Initial treatment will address active decay to prevent progression, followed by restorative procedures to improve function and stability. Patient has expressed interest in cosmetic enhancements after the primary restorative phase. This can be reviewed once healing is complete. Maintaining excellent oral hygiene, particularly around restoration margins, is strongly recommended.",
      phases: [
        {
          title: "First phase",
          description: "Initial diagnostics and preventive care",
          weeks: "Phases Weeks",
        },
        {
          title: "Second phase",
          description: "Restorative work and endodontics",
          weeks: "Phases Weeks",
        },
        {
          title: "Third phase",
          description: "Final restorations and follow-up",
          weeks: "Phases Weeks",
        },
      ],
    },
    procedures: [
      {
        id: "proc-1",
        title: "Procedure Title First",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        completedDate: "18.08.2025",
        status: "completed",
        phase: 1,
        tooth: "11",
        price: 100,
        discount: 10,
        quantity: 1,
        appointment: {
          id: "apt-1",
          title: "First appointment",
          datetime: "12.07.2026",
        },
        invoice: {
          id: "inv-1",
          amount: 5,
          status: "In progress",
        },
      },
      {
        id: "proc-2",
        title: "Procedure Title Second",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        status: "scheduled",
        phase: 2,
        tooth: "12",
        price: 200,
        discount: 50,
        quantity: 2,
        appointment: {
          id: "apt-2",
          title: "Second appointment",
          datetime: "12.08.2026",
        },
        invoice: {
          id: "inv-2",
          amount: 5,
          status: "In progress",
        },
      },
      {
        id: "proc-3",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        status: "planned",
        phase: 3,
        tooth: "13",
        price: 300,
        discount: 100,
        quantity: 2,
        appointment: {
          id: "apt-3",
          title: "Third appointment",
          datetime: "20.09.2026",
        },
        invoice: {
          id: "inv-3",
          amount: 5,
          status: "Pending",
        },
      },
      {
        id: "proc-4",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        status: "planned",
        phase: 2,
        tooth: "13",
        price: 300,
        discount: 100,
        quantity: 2,
        appointment: {
          id: "apt-4",
          title: "Fourth appointment",
          datetime: "01.10.2026",
        },
        invoice: {
          id: "inv-4",
          amount: 5,
          status: "Pending",
        },
      },
      {
        id: "proc-5",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        status: "planned",
        phase: 2,
        tooth: "13",
        price: 300,
        discount: 40,
        quantity: 2,
        appointment: {
          id: "apt-5",
          title: "Fifth appointment",
          datetime: "18.10.2026",
        },
        invoice: {
          id: "inv-5",
          amount: 5,
          status: "Pending",
        },
      },
      {
        id: "proc-6",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        status: "planned",
        phase: 3,
        tooth: "13",
        price: 300,
        discount: 20,
        quantity: 2,
        appointment: {
          id: "apt-6",
          title: "Sixth appointment",
          datetime: "01.11.2026",
        },
        invoice: {
          id: "inv-6",
          amount: 5,
          status: "Pending",
        },
      },
      {
        id: "proc-7",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        status: "planned",
        phase: 3,
        tooth: "13",
        price: 100,
        discount: 0,
        quantity: 2,
        appointment: {
          id: "apt-7",
          title: "Seventh appointment",
          datetime: "14.11.2026",
        },
        invoice: {
          id: "inv-7",
          amount: 5,
          status: "Pending",
        },
      },
    ],
  },
];

export const MOCK_DOCTOR: TreatmentPerson = {
  id: "doctor-1",
  name: "Dr. Samantha Smith",
  email: "samantha.smith@clinic.com",
};

export const MOCK_PATIENT: TreatmentPerson = {
  id: "patient-1",
  name: "Valerii Patient",
  email: "valerii@example.com",
};
