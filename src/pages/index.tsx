import Head from "next/head";
import { Inter } from "next/font/google";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tab,
  Tooltip,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import parser from "cron-parser";
import dayjs from "dayjs";
import cronstrue from "cronstrue";
import {
  MRT_EditActionButtons,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableOptions,
  useMaterialReactTable,
  MRT_TableContainer,
  MRT_TopToolbar,
} from "material-react-table";
import { nanoid } from "nanoid";
import { CronJob } from "cron";

const inter = Inter({ subsets: ["latin"] });

export type Checklist = {
  cron: string;
  task: string;
  enabled: boolean;
  lastChecked: Date;
  id: string;
};

function setLocalstorage(newChecklist: Checklist[]) {
  localStorage.setItem("checklist", JSON.stringify(newChecklist));
}

function getChecklist(): Checklist[] {
  return typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("checklist") as string)
    : [];
}

export default function Home() {
  useEffect(() => {
    const cronjob = new CronJob(
      "* * * * *",
      () => {
        const checklist = getChecklist();
        setChecklist(checklist);
        console.log("cronjob executed");
      },
      null,
      true,
      "Europe/Helsinki"
    );
  }, []);

  const [value, setValue] = useState("1");
  const [checklist, setChecklist] = useState<Checklist[]>([]);

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  const markDone = (id: string) => {
    const clone: Checklist[] = JSON.parse(JSON.stringify(checklist));
    const listItem = clone.find((c) => c.id === id);
    if (listItem) {
      listItem.lastChecked = new Date();
      setLocalstorage(clone);
      setChecklist(clone);
    }
  };

  useEffect(() => {
    const checklist = getChecklist();
    setChecklist(checklist);
  }, []);

  const columns = useMemo<MRT_ColumnDef<Checklist>[]>(
    () => [
      {
        accessorKey: "task",
        header: "Task",
        muiEditTextFieldProps: {
          required: true,
        },
        size: 50,
      },
      {
        accessorKey: "cron",
        header: "Cron",
        muiEditTextFieldProps: {
          required: true,
        },
        Cell({ row }) {
          return (
            <>{cronstrue.toString(row.original.cron, { verbose: true })}</>
          );
        },
        size: 50,
      },
    ],
    []
  );

  const handleCreateChecklistItem: MRT_TableOptions<Checklist>["onCreatingRowSave"] =
    async ({ values, table }) => {
      try {
        const crons = cronstrue.toString(values.cron);
        const checklist = getChecklist();
        checklist.push({
          task: values.task,
          cron: values.cron,
          lastChecked: new Date(),
          enabled: true,
          id: nanoid(),
        });
        setChecklist(checklist);
        setLocalstorage(checklist);
        table.setCreatingRow(null);
      } catch (error) {
        console.error(error);
      }
    };

  const handleSaveChecklistItem: MRT_TableOptions<Checklist>["onEditingRowSave"] =
    async ({ values, table, row }) => {
      try {
        const crons = cronstrue.toString(values.cron);
        const checklist = getChecklist();
        const found = checklist.find((c) => c.id === row.original.id);
        if (found) {
          found.cron = values.cron;
          found.task = values.task;
          setChecklist(checklist);
          setLocalstorage(checklist);
          table.setEditingRow(null);
        }
      } catch (error) {
        console.error(error);
      }
    };

  const openDeleteConfirmModal = (row: MRT_Row<Checklist>) => {
    if (window.confirm(`Do you want to delete ${row.original.task}?`)) {
      try {
        const checklist = getChecklist();
        const newChecklist = checklist.filter((c) => c.id !== row.original.id);
        setChecklist(newChecklist);
        setLocalstorage(newChecklist);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const table = useMaterialReactTable({
    columns,
    data: checklist,
    enablePagination: false,
    createDisplayMode: "modal",
    editDisplayMode: "modal",
    enableEditing: true,
    getRowId: (row) => row.id,
    muiTableContainerProps: {
      sx: {
        minHeight: "500px",
        maxWidth: "100%",
      },
    },
    onCreatingRowSave: handleCreateChecklistItem,
    onEditingRowSave: handleSaveChecklistItem,
    renderCreateRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h5">Create task</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {internalEditComponents}
        </DialogContent>
        <DialogActions>
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </DialogActions>
      </>
    ),
    //optionally customize modal content
    renderEditRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h5">Edit task</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {internalEditComponents}
        </DialogContent>
        <DialogActions>
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </DialogActions>
      </>
    ),
    renderRowActions: ({ row, table }) => (
      <Box sx={{ display: "flex" }}>
        <Tooltip title="Edit">
          <IconButton onClick={() => table.setEditingRow(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton color="error" onClick={() => openDeleteConfirmModal(row)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    renderTopToolbarCustomActions: ({ table }) => (
      <Button
        variant="contained"
        onClick={() => {
          table.setCreatingRow(true);
        }}
      >
        New Task
      </Button>
    ),
  });

  return (
    <>
      <Head>
        <title>Cron checklist</title>
      </Head>
      <TabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <TabList centered onChange={handleChange}>
            <Tab label="Checklist" value="1" />
            <Tab label="Settings" value="2" />
          </TabList>
        </Box>
        <TabPanel
          value="1"
          sx={{
            padding: 0,
          }}
        >
          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            {checklist.map((checklist) => {
              const parsed = parser.parseExpression(checklist.cron, {
                currentDate: new Date(checklist.lastChecked),
              });

              const next = parsed.next().toDate();

              const isDone = dayjs(next).isAfter(new Date());

              return (
                <ListItem
                  key={checklist.id}
                  sx={
                    {
                      // display: isDone ? "none" : "flex",
                    }
                  }
                >
                  <ListItemAvatar>
                    {isDone ? (
                      <IconButton>
                        <CheckBoxIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        onClick={(event) => {
                          markDone(checklist.id);
                        }}
                      >
                        <CheckBoxOutlineBlankIcon />
                      </IconButton>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={checklist.task}
                    secondary={cronstrue.toString(checklist.cron, {
                      verbose: true,
                    })}
                  />
                </ListItem>
              );
            })}
          </List>
        </TabPanel>
        <TabPanel
          value="2"
          sx={{
            padding: 0,
          }}
        >
          <MRT_TopToolbar table={table} />
          <MRT_TableContainer table={table} />
        </TabPanel>
      </TabContext>
    </>
  );
}
