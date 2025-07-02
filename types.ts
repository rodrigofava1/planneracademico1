export enum TaskStatus {
  Pending = 'Pendente',
  Completed = 'Concluído',
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  courseLoad?: number; // Carga horária em horas
  absences?: number;   // Número de faltas (aulas)
}

export interface Task {
  id: string;
  subjectId: string;
  title: string;
  dueDate: string; // ISO string format for dates
  status: TaskStatus;
}