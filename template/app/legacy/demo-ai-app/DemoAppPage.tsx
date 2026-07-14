import { type Task } from "wasp/entities";

import { Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  createTask,
  deleteTask,
  generateGptResponse,
  getAllTasksByUser,
  updateTask,
  useQuery,
} from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Checkbox } from "../client/components/ui/checkbox";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import { useI18n } from "../i18n";
import type {
  GeneratedSchedule,
  Task as ScheduleTask,
  TaskItem,
  TaskPriority,
} from "./schedule";

export function DemoAppPage() {
  const copy = useDemoCopy();

  return (
    <div className="py-10 lg:mt-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-primary">AI</span> {copy.title}
          </h2>
        </div>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-lg leading-8">
          {copy.description}
        </p>
        {/* begin AI-powered Todo List */}
        <Card className="bg-muted/10 my-8">
          <CardContent className="mx-auto my-8 space-y-10 px-6 py-10 sm:w-[90%] md:w-[70%] lg:w-[50%]">
            <NewTaskForm handleCreateTask={createTask} />
          </CardContent>
        </Card>
        {/* end AI-powered Todo List */}
      </div>
    </div>
  );
}

function NewTaskForm({
  handleCreateTask,
}: {
  handleCreateTask: typeof createTask;
}) {
  const copy = useDemoCopy();
  const [description, setDescription] = useState<string>("");
  const [todaysHours, setTodaysHours] = useState<number>(8);
  const [response, setResponse] = useState<GeneratedSchedule | null>(null);
  const [isPlanGenerating, setIsPlanGenerating] = useState<boolean>(false);

  const { data: tasks, isLoading: isTasksLoading } =
    useQuery(getAllTasksByUser);

  const handleSubmit = async () => {
    try {
      await handleCreateTask({ description });
      setDescription("");
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unexpectedError;
      window.alert(`${copy.error}: ${message}`);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setIsPlanGenerating(true);
      const response = await generateGptResponse({
        hours: todaysHours,
      });
      if (response) {
        setResponse(response);
      }
    } catch (err) {
      toast({
        title: copy.error,
        description: localizeDemoError(
          err instanceof Error ? err.message : undefined,
          copy,
        ),
        variant: "destructive",
      });
    } finally {
      setIsPlanGenerating(false);
    }
  };

  return (
    <div className="flex flex-col justify-center gap-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Input
            type="text"
            id="description"
            className="flex-1"
            placeholder={copy.taskPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!description}
            variant="default"
            size="default"
          >
            {copy.addTask}
          </Button>
        </div>
      </div>

      <div className="col-span-full space-y-10">
        {isTasksLoading && (
          <div className="text-muted-foreground">{copy.loading}</div>
        )}
        {tasks! && tasks.length > 0 ? (
          <div className="space-y-4">
            {tasks.map((task: Task) => (
              <Todo
                key={task.id}
                id={task.id}
                isDone={task.isDone}
                description={task.description}
                time={task.time}
              />
            ))}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="time"
                  className="text-muted-foreground text-nowrap text-sm font-semibold"
                >
                  {copy.hoursQuestion}
                </Label>
                <Input
                  type="number"
                  id="time"
                  step={0.5}
                  min={1}
                  max={24}
                  className="min-w-28 text-center"
                  value={todaysHours}
                  onChange={(e) => setTodaysHours(+e.currentTarget.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-center">
            {copy.addTasksToBegin}
          </div>
        )}
      </div>

      <Button
        type="button"
        disabled={isPlanGenerating || tasks?.length === 0}
        onClick={() => handleGeneratePlan()}
        variant="default"
        size="default"
        className="w-full"
        data-testid="generate-schedule-button"
      >
        {isPlanGenerating ? (
          <>
            <Loader2 className="mr-2 inline-block animate-spin" />
            {copy.generating}
          </>
        ) : (
          copy.generateSchedule
        )}
      </Button>

      {!!response && (
        <div className="flex flex-col">
          <h3 className="text-foreground mb-4 text-lg font-semibold">
            {copy.todaysSchedule}
          </h3>
          <Schedule schedule={response} />
        </div>
      )}
    </div>
  );
}

type TodoProps = Pick<Task, "id" | "isDone" | "description" | "time">;

function Todo({ id, isDone, description, time }: TodoProps) {
  const copy = useDemoCopy();
  const handleCheckboxChange = async (checked: boolean) => {
    await updateTask({
      id,
      isDone: checked,
    });
  };

  const handleTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await updateTask({
      id,
      time: e.currentTarget.value,
    });
  };

  const handleDeleteClick = async () => {
    await deleteTask({ id });
  };

  return (
    <Card className="p-4">
      <div className="flex w-full items-center justify-between">
        <div className="flex w-full items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isDone}
              onCheckedChange={handleCheckboxChange}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span
              className={cn("text-foreground", {
                "text-muted-foreground line-through": isDone,
              })}
            >
              {description}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="time"
              type="number"
              min={0.5}
              step={0.5}
              className={cn("w-18 h-8 text-center text-xs", {
                "pointer-events-none opacity-50": isDone,
              })}
              value={time}
              onChange={handleTimeChange}
            />
            <span
              className={cn("text-muted-foreground text-xs italic", {
                "text-muted-foreground": isDone,
              })}
            >
              {copy.hoursShort}
            </span>
          </div>
        </div>
        <div className="w-15 flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            title={copy.removeTask}
            className="text-destructive hover:text-destructive/80 h-auto p-1"
          >
            <Trash2 size="20" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Schedule({ schedule }: { schedule: GeneratedSchedule }) {
  const copy = useDemoCopy();

  return (
    <div className="flex flex-col gap-6 py-6" data-testid="schedule">
      <div className="space-y-4">
        {schedule.tasks ? (
          schedule.tasks
            .map((task) => (
              <TaskCard
                key={task.name}
                task={task}
                taskItems={schedule.taskItems}
              />
            ))
            .sort((a, b) => {
              const priorityOrder: TaskPriority[] = ["low", "medium", "high"];
              if (a.props.task.priority && b.props.task.priority) {
                return (
                  priorityOrder.indexOf(b.props.task.priority) -
                  priorityOrder.indexOf(a.props.task.priority)
                );
              } else {
                return 0;
              }
            })
        ) : (
          <div className="text-muted-foreground text-center">
            {copy.noTasksReturned}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  taskItems,
}: {
  task: ScheduleTask;
  taskItems: TaskItem[];
}) {
  const copy = useDemoCopy();
  const taskPriorityToColorMap: Record<TaskPriority, string> = {
    high: "bg-destructive/10 border-destructive/20 text-red-500",
    medium: "bg-warning/10 border-warning/20 text-warning",
    low: "bg-success/10 border-success/20 text-success",
  };

  return (
    <Card className={cn("border-2", taskPriorityToColorMap[task.priority])}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{task.name}</span>
          <span className="text-xs font-medium italic">
            {" "}
            {copy.priority(task.priority)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {taskItems ? (
          <ul className="space-y-2">
            {taskItems.map((taskItem) => {
              if (taskItem.taskName === task.name) {
                return (
                  <TaskCardItem key={taskItem.description} {...taskItem} />
                );
              }
              return null;
            })}
          </ul>
        ) : (
          <div className="text-muted-foreground text-center">
            {copy.noItemsReturned}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskCardItem({ description, time }: TaskItem) {
  const copy = useDemoCopy();
  const [isDone, setIsDone] = useState<boolean>(false);

  const formattedTime = useMemo(() => copy.duration(time), [copy, time]);

  const handleCheckedChange = (checked: boolean | "indeterminate") => {
    setIsDone(checked === true);
  };

  return (
    <li className="flex items-center justify-between gap-4 rounded-md p-2">
      <div className="flex flex-1 items-center gap-3">
        <Checkbox
          checked={isDone}
          onCheckedChange={handleCheckedChange}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <span
          className={cn("text-sm leading-tight", {
            "text-muted-foreground line-through opacity-50": isDone,
          })}
        >
          {description}
        </span>
      </div>
      <span
        className={cn("text-muted-foreground text-sm", {
          "line-through opacity-50": isDone,
        })}
      >
        {formattedTime}
      </span>
    </li>
  );
}

type DemoCopy = {
  title: string;
  description: string;
  taskPlaceholder: string;
  addTask: string;
  loading: string;
  hoursQuestion: string;
  addTasksToBegin: string;
  generating: string;
  generateSchedule: string;
  todaysSchedule: string;
  hoursShort: string;
  removeTask: string;
  noTasksReturned: string;
  noItemsReturned: string;
  error: string;
  unexpectedError: string;
  apiNotConfigured: string;
  providerFailed: string;
  priority: (priority: TaskPriority) => string;
  duration: (hours: number) => string;
};

const demoCopy: Record<"en" | "zh-CN", DemoCopy> = {
  en: {
    title: "Day Scheduler",
    description:
      "Add today's tasks and let the configured AI service turn them into a practical schedule.",
    taskPlaceholder: "Enter a task",
    addTask: "Add task",
    loading: "Loading...",
    hoursQuestion: "How many hours will you work today?",
    addTasksToBegin: "Add tasks to begin",
    generating: "Generating...",
    generateSchedule: "Generate schedule",
    todaysSchedule: "Today's schedule",
    hoursShort: "hrs",
    removeTask: "Remove task",
    noTasksReturned: "The AI service did not return any tasks. Try again.",
    noItemsReturned: "The AI service did not return any subtasks. Try again.",
    error: "Error",
    unexpectedError: "Something went wrong",
    apiNotConfigured:
      "Configure the AI provider API key before generating a schedule.",
    providerFailed:
      "The AI request failed. Check the provider URL, model, and API key.",
    priority: (priority) => `${priority} priority`,
    duration: formatEnglishDuration,
  },
  "zh-CN": {
    title: "日程调度器",
    description: "添加今天的任务，由网页中配置的 AI 服务自动拆分并安排日程。",
    taskPlaceholder: "输入任务内容",
    addTask: "添加任务",
    loading: "正在加载...",
    hoursQuestion: "今天计划工作多少小时？",
    addTasksToBegin: "先添加任务再生成日程",
    generating: "正在生成...",
    generateSchedule: "生成日程",
    todaysSchedule: "今日日程",
    hoursShort: "小时",
    removeTask: "删除任务",
    noTasksReturned: "AI 服务没有返回任务，请重试。",
    noItemsReturned: "AI 服务没有返回子任务，请重试。",
    error: "操作失败",
    unexpectedError: "操作未完成，请稍后重试",
    apiNotConfigured: "请先在“AI 服务配置”中填写并保存 API 密钥。",
    providerFailed: "AI 调用失败，请检查接口地址、模型名称和 API 密钥。",
    priority: (priority) =>
      ({ high: "高优先级", medium: "中优先级", low: "低优先级" })[priority],
    duration: formatChineseDuration,
  },
};

function useDemoCopy(): DemoCopy {
  const { locale } = useI18n();
  return demoCopy[locale];
}

function localizeDemoError(
  message: string | undefined,
  copy: DemoCopy,
): string {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("api key") && normalized.includes("not configured")) {
    return copy.apiNotConfigured;
  }
  if (normalized.includes("provider request failed")) {
    return copy.providerFailed;
  }
  return message || copy.unexpectedError;
}

function formatEnglishDuration(time: number): string {
  if (time === 0) return "0 min";
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  return [hours > 0 ? `${hours} hr` : "", minutes > 0 ? `${minutes} min` : ""]
    .filter(Boolean)
    .join(" ");
}

function formatChineseDuration(time: number): string {
  if (time === 0) return "0 分钟";
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  return [
    hours > 0 ? `${hours} 小时` : "",
    minutes > 0 ? `${minutes} 分钟` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
