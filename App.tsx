import React, { useState, useMemo } from 'react';
import { Subject, Task, TaskStatus } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import SubjectModal from './components/SubjectModal';
import TaskModal from './components/TaskModal';
import EmptyState from './components/EmptyState';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, BookOpenIcon, MinusIcon } from './components/icons';

const App: React.FC = () => {
  const [subjects, setSubjects] = useLocalStorage<Subject[]>('subjects', []);
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);

  const [isSubjectModalOpen, setSubjectModalOpen] = useState(false);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const handleSaveSubject = (subject: Subject) => {
    const index = subjects.findIndex((s) => s.id === subject.id);
    if (index > -1) {
      const newSubjects = [...subjects];
      newSubjects[index] = subject;
      setSubjects(newSubjects);
    } else {
      setSubjects([...subjects, subject]);
    }
  };
  
  const handleDeleteSubject = (subjectId: string) => {
    if(window.confirm("Tem certeza que deseja excluir esta disciplina? Todas as tarefas e controles de falta associados também serão excluídos.")) {
        setSubjects(subjects.filter(s => s.id !== subjectId));
        setTasks(tasks.filter(t => t.subjectId !== subjectId));
    }
  };

  const handleSaveTask = (task: Task) => {
    const index = tasks.findIndex((t) => t.id === task.id);
    if (index > -1) {
      const newTasks = [...tasks];
      newTasks[index] = task;
      setTasks(newTasks);
    } else {
      setTasks([...tasks, task]);
    }
  };
  
  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };
  
  const toggleTaskStatus = (taskId: string) => {
      const newTasks = tasks.map(task => {
        if (task.id === taskId) {
            return {...task, status: task.status === TaskStatus.Pending ? TaskStatus.Completed : TaskStatus.Pending };
        }
        return task;
      });
      setTasks(newTasks);
  };

  const handleAddAbsence = (subjectId: string) => {
    setSubjects(subjects.map(s => 
        s.id === subjectId 
        ? { ...s, absences: (s.absences || 0) + 1 }
        : s
    ));
  };

  const handleRemoveAbsence = (subjectId: string) => {
      setSubjects(subjects.map(s => 
          s.id === subjectId && s.absences && s.absences > 0
          ? { ...s, absences: s.absences - 1 }
          : s
      ));
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks]);

  const getSubject = (subjectId: string) => subjects.find(s => s.id === subjectId);
  
  const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  const TaskCard: React.FC<{task: Task}> = ({ task }) => {
    const subject = getSubject(task.subjectId);
    const isCompleted = task.status === TaskStatus.Completed;
    const isPastDue = !isCompleted && new Date(task.dueDate) < new Date();

    return (
        <div className={`bg-white/60 backdrop-blur-sm border border-white rounded-xl shadow-lg p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isCompleted ? 'opacity-60' : ''}`}>
            <div>
                <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm" style={{backgroundColor: subject?.color, color: 'white'}}>{subject?.name || 'Sem Disciplina'}</span>
                    <span className={`text-xs font-bold ${isCompleted ? 'text-green-600' : isPastDue ? 'text-red-600' : 'text-slate-500'}`}>
                      {isCompleted ? 'Concluído' : isPastDue ? 'Atrasado' : 'Pendente'}
                    </span>
                </div>
                <h3 className={`font-bold text-xl my-3 text-slate-800 ${isCompleted ? 'line-through' : ''}`}>{task.title}</h3>
                <div className="flex items-center mt-3 text-sm text-slate-600">
                    <CalendarIcon className="w-4 h-4 mr-2"/>
                    <span>{formatDate(task.dueDate)}</span>
                </div>
            </div>
            <div className="flex justify-end items-center gap-2 mt-6">
                <button onClick={() => { setTaskToEdit(task); setTaskModalOpen(true);}} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-100/50">
                    <PencilIcon className="w-5 h-5"/>
                </button>
                <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-slate-500 hover:text-red-600 transition-colors rounded-full hover:bg-red-100/50">
                    <TrashIcon className="w-5 h-5"/>
                </button>
                <button onClick={() => toggleTaskStatus(task.id)} className={`p-2 rounded-full transition-colors ${isCompleted ? 'text-slate-500 hover:text-yellow-600 hover:bg-yellow-100/50' : 'text-slate-500 hover:text-green-600 hover:bg-green-100/50'}`}>
                   {isCompleted ? <XCircleIcon className="w-6 h-6"/> : <CheckCircleIcon className="w-6 h-6"/>}
                </button>
            </div>
        </div>
    )
  }

  const AbsenceCard: React.FC<{subject: Subject}> = ({ subject }) => {
    if (!subject.courseLoad || subject.courseLoad <= 0) {
        return null;
    }

    const absences = subject.absences || 0;
    
    // 1 hora de carga horária = 60 minutos. 1 falta = 1 aula de 50 minutos.
    const totalCourseMinutes = subject.courseLoad * 60;
    const totalAbsenceMinutes = absences * 50;
    const percentage = totalCourseMinutes > 0 ? (totalAbsenceMinutes / totalCourseMinutes) * 100 : 0;
    
    const maxAbsenceMinutes = totalCourseMinutes * 0.25;
    const maxAbsencesInClasses = Math.floor(maxAbsenceMinutes / 50);

    let status: 'Seguro' | 'Atenção' | 'Perigo' = 'Seguro';
    let statusColorClass = 'text-green-600 bg-green-100';
    let progressBarColorClass = 'bg-green-500';

    if (percentage >= 25) {
        status = 'Perigo';
        statusColorClass = 'text-red-600 bg-red-100';
        progressBarColorClass = 'bg-red-500';
    } else if (percentage >= 20) {
        status = 'Atenção';
        statusColorClass = 'text-yellow-600 bg-yellow-100';
        progressBarColorClass = 'bg-yellow-500';
    }

    return (
        <div className="bg-white/60 backdrop-blur-sm border border-white rounded-xl shadow-lg p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-lg text-slate-800" style={{ borderLeft: `4px solid ${subject.color}`, paddingLeft: '8px' }}>
                      {subject.name}
                  </span>
                  <span className={`font-bold text-xs px-3 py-1 rounded-full shadow-sm ${statusColorClass}`}>
                      {status}
                  </span>
              </div>
              
              <div className="flex items-center justify-center my-6 gap-6">
                  <button 
                      onClick={() => handleRemoveAbsence(subject.id)} 
                      disabled={absences === 0}
                      className="p-2.5 text-slate-600 bg-white shadow-md hover:text-red-600 transition-all duration-300 rounded-full hover:bg-red-100/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-600"
                      aria-label={`Remover falta de ${subject.name}`}>
                      <MinusIcon className="w-6 h-6"/>
                  </button>
                  <div className="text-center">
                      <p className="text-5xl font-extrabold text-slate-800">{absences}</p>
                      <p className="text-sm text-slate-500 font-medium">Faltas</p>
                  </div>
                  <button 
                      onClick={() => handleAddAbsence(subject.id)}
                      className="p-2.5 text-slate-600 bg-white shadow-md hover:text-green-600 transition-all duration-300 rounded-full hover:bg-green-100/50"
                      aria-label={`Adicionar falta em ${subject.name}`}>
                      <PlusIcon className="w-6 h-6"/>
                  </button>
              </div>
            </div>

            <div>
                <div className="flex justify-between text-sm font-medium text-slate-600 mb-1">
                    <span>Progresso de Faltas</span>
                    <span>{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-2.5 rounded-full ${progressBarColorClass} transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 text-right">
                    Limite: {maxAbsencesInClasses} faltas
                </p>
            </div>
        </div>
    );
  }

  const subjectsWithCourseLoad = subjects.filter(s => s.courseLoad && s.courseLoad > 0);

  return (
    <>
      <div className="min-h-screen">
        <header className="bg-white/80 backdrop-blur-lg shadow-md sticky top-0 z-40 border-b border-slate-900/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center">
                <BookOpenIcon className="w-8 h-8 text-indigo-600"/>
                <h1 className="text-3xl font-extrabold ml-3 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    Planner Acadêmico
                </h1>
            </div>
            <div className="flex gap-2">
                 <button onClick={() => { setSubjectToEdit(null); setSubjectModalOpen(true); }} className="hidden sm:inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                    <PlusIcon className="w-5 h-5 mr-2 text-slate-500"/>
                    Nova Disciplina
                </button>
                 <button onClick={() => { setTaskToEdit(null); setTaskModalOpen(true); }} className="inline-flex items-center px-4 py-2 border border-transparent shadow-lg text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:shadow-indigo-500/50 transform hover:-translate-y-0.5 transition-all duration-300">
                    <PlusIcon className="w-5 h-5 mr-2"/>
                    Nova Tarefa
                </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <section id="disciplinas" className="mb-12">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">Minhas Disciplinas</h2>
                {subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {subjects.map(subject => (
                            <div key={subject.id} className="group relative flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm transition-transform hover:scale-105" style={{backgroundColor: subject.color}}>
                                <span className="font-semibold text-white">{subject.name}</span>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center gap-2">
                                    <button onClick={() => { setSubjectToEdit(subject); setSubjectModalOpen(true); }} className="p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-black/20">
                                        <PencilIcon className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => handleDeleteSubject(subject.id)} className="p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-black/20">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500">Nenhuma disciplina cadastrada ainda. Adicione uma para começar.</p>
                )}
                 <button onClick={() => { setSubjectToEdit(null); setSubjectModalOpen(true); }} className="sm:hidden mt-4 inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                    <PlusIcon className="w-5 h-5 mr-2 text-slate-500"/>
                    Nova Disciplina
                </button>
            </section>
            
            <section id="controle-faltas" className="mb-12">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">Controle de Faltas</h2>
                {subjectsWithCourseLoad.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjectsWithCourseLoad.map(subject => (
                            <AbsenceCard key={subject.id} subject={subject} />
                        ))}
                    </div>
                ) : (
                     <EmptyState 
                        title="Monitore suas faltas aqui"
                        message="Para começar, adicione ou edite uma disciplina informando a Carga Horária total."
                        buttonText="Adicionar Disciplina"
                        onButtonClick={() => { setSubjectToEdit(null); setSubjectModalOpen(true); }}
                        icon={<CalendarIcon className="mx-auto h-16 w-16 text-slate-400/80" />}
                    />
                )}
            </section>

            <section id="tarefas">
                 <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">Próximas Tarefas</h2>
                 {tasks.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {sortedTasks.map(task => <TaskCard key={task.id} task={task} />)}
                     </div>
                 ) : (
                    <EmptyState 
                        title="Nenhuma tarefa por aqui"
                        message="Comece adicionando suas provas, trabalhos e outras atividades para não perder nenhum prazo."
                        buttonText="Adicionar Tarefa"
                        onButtonClick={() => { setTaskToEdit(null); setTaskModalOpen(true); }}
                    />
                 )}
            </section>
        </main>

        <footer className="text-center py-8 px-4">
             <p className="text-sm text-slate-500">Feito com ❤️ por um Engenheiro Frontend de classe mundial.</p>
        </footer>
      </div>

      <SubjectModal 
        isOpen={isSubjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        onSave={handleSaveSubject}
        subjectToEdit={subjectToEdit}
      />
      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        subjects={subjects}
        taskToEdit={taskToEdit}
      />
    </>
  );
};

export default App;