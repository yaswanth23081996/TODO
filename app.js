const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const isValid = require("date-fns/isValid");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

const hasStatus = (requestquery) => {
  return requestquery.status !== undefined;
};

const hasPriority = (requestquery) => {
  return requestquery.priority !== undefined;
};

const hasPriorityStatus = (requestquery) => {
  return (
    requestquery.status !== undefined && requestquery.priority !== undefined
  );
};

const hasCategoryStatus = (requestquery) => {
  return (
    requestquery.status !== undefined && requestquery.category !== undefined
  );
};

const hasCategory = (requestquery) => {
  return requestquery.category !== undefined;
};

const hasCategoryPriority = (requestquery) => {
  return (
    requestquery.category !== undefined && requestquery.priority !== undefined
  );
};

app.get("/todos/", async (request, respond) => {
  let data = null;
  let getTodosQuery = "";
  const { status, priority, search_q = "", category } = request.query;
  switch (true) {
    case hasStatus(request.query):
      if (status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE") {
        respond.status(400);
        respond.send("Invalid Todo Status");
        break;
      } else {
        getTodosQuery = `select * from todo where
            todo like "%${search_q}%" and status="${status}";`;
        data = await database.all(getTodosQuery);
        respond.send(
          data.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
        );
        break;
      }
    case hasPriority(request.query):
      if (priority !== "HIGH" && priority !== "LOW" && priority !== "MEDIUM") {
        respond.status(400);
        respond.send("Invalid Todo Priority");
        break;
      } else {
        getTodosQuery = `select * from todo where
            todo like "%${search_q}%" and priority="${priority}";`;
        data = await database.all(getTodosQuery);
        respond.send(
          data.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
        );
        break;
      }
    case hasPriorityStatus(request.query):
      getTodosQuery = `select * from todo where
            todo like "%${search_q}%" and status="${status}" and priority="${priority}";`;
      data = await database.all(getTodosQuery);
      respond.send(
        data.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
      );
      break;
    case hasCategoryStatus(request.query):
      getTodosQuery = `select * from todo where
            todo like "%${search_q}%" and category="${category}" and status="${status}";`;
      data = await database.all(getTodosQuery);
      respond.send(
        data.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
      );
      break;
    case hasCategory(request.query):
      if (
        category !== "WORK" &&
        category !== "HOME" &&
        category !== "LEARNING"
      ) {
        respond.status(400);
        respond.send("Invalid Todo Category");
        break;
      } else {
        getTodosQuery = `select * from todo where
            todo like "%${search_q}%" and category="${category}";`;
        data = await database.all(getTodosQuery);
        respond.send(
          data.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
        );
        break;
      }
    case hasCategoryPriority(request.query):
      getTodosQuery = `select * from todo where
            todo like "%${search_q}%" and category="${category}" priority="${priority}";`;
      data = await database.all(getTodosQuery);
      respond.send(
        data.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
      );
      break;
    default:
      getTodosQuery = `select * from todo where
            todo like "%${search_q}%";`;
      data = await database.all(getTodosQuery);
      respond.send(
        data.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
      );
  }
});

app.get("/todos/:todoId/", async (request, respond) => {
  const { todoId } = request.params;
  const query = `select * from todo where id=${todoId};`;
  const result = await database.get(query);
  respond.send(convertDbObjectToResponseObject(result));
});

const format = require("date-fns/format");
app.get("/agenda/", async (request, respond) => {
  const { date } = request.query;
  const a = date.split("-");

  const valid = isValid(
    new Date(parseInt(a[0]), parseInt(a[1]) - 1, parseInt(a[2]))
  );

  if (valid) {
    const result1 = format(
      new Date(parseInt(a[0]), parseInt(a[1]) - 1, parseInt(a[2])),
      "yyyy-MM-dd"
    );
    const query = `select * from todo where due_date= "${result1}";`;
    const result = await database.all(query);
    respond.send(
      result.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
    );
  } else {
    respond.status(400);
    respond.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, respond) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const a = dueDate.split("-");
  const valid = isValid(
    new Date(parseInt(a[0]), parseInt(a[1]) - 1, parseInt(a[2]))
  );
  console.log(valid);
  if (status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE") {
    respond.status(400);
    respond.send("Invalid Todo Status");
  } else if (
    priority !== "HIGH" &&
    priority !== "LOW" &&
    priority !== "MEDIUM"
  ) {
    respond.status(400);
    respond.send("Invalid Todo Priority");
  } else if (
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING"
  ) {
    respond.status(400);
    respond.send("Invalid Todo Category");
  } else if (valid !== true) {
    respond.status(400);
    respond.send("Invalid Due Date");
  } else {
    const query = `insert into todo (id,todo,priority,status,category,due_date) 
    values (${id},"${todo}","${priority}","${status}","${category}","${dueDate}");`;
    const response1 = await database.run(query);
    const todoId = response1.lastID;
    respond.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, respond) => {
  const { status, priority, todo, category, dueDate } = request.body;
  const { todoId } = request.params;

  if (status !== undefined) {
    if (status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE") {
      respond.status(400);
      respond.send("Invalid Todo Status");
    } else {
      const query = `UPDATE todo 
        SET status="${status}"
        where id=${todoId};`;
      await database.run(query);
      respond.send("Status Updated");
    }
  } else if (priority !== undefined) {
    if (priority !== "HIGH" && priority !== "LOW" && priority !== "MEDIUM") {
      respond.status(400);
      respond.send("Invalid Todo Priority");
    } else {
      const query = `UPDATE todo 
        SET priority="${priority}"
        where id=${todoId};`;
      await database.run(query);
      respond.send("Priority Updated");
    }
  } else if (todo !== undefined) {
    const query = `UPDATE todo 
        SET todo="${todo}"
        where id=${todoId};`;
    await database.run(query);
    respond.send("Todo Updated");
  } else if (category !== undefined) {
    if (category !== "WORK" && category !== "HOME" && category !== "LEARNING") {
      respond.status(400);
      respond.send("Invalid Todo Category");
    } else {
      const query = `UPDATE todo 
        SET category="${category}"
        where id=${todoId};`;
      await database.run(query);
      respond.send("Category Updated");
    }
  } else {
    const a = dueDate.split("-");

    const valid = isValid(
      new Date(parseInt(a[0]), parseInt(a[1]) - 1, parseInt(a[2]))
    );
    if (valid) {
      const query = `UPDATE todo 
        SET due_date="${dueDate}"
        where id=${todoId};`;
      await database.run(query);
      respond.send("Due Date Updated");
    } else {
      respond.status(400);
      respond.send("Invalid Due Date");
    }
  }
});

app.delete("/todos/:todoId/", async (request, respond) => {
  const { todoId } = request.params;
  query = `delete from todo where id=${todoId}; `;
  await database.run(query);
  respond.send("Todo Deleted");
});

module.exports = app;
