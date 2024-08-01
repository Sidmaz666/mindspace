import express from "express"
import {createServer} from "http"
import {hostname} from "os"
import {Server} from "socket.io"
import path from 'path'
import Question from "./functions/call_ai.js"

// For shuffle
Array.prototype.shuffle = function() {
  for (let i = this.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this[i], this[j]] = [this[j], this[i]];
  }
  return this;
};

const __dirname = path.resolve()
const app = express()
const server = createServer(app)
const socket = new Server(server)

const rooms = {}
const questions = {}

const port = process.env.PORT || 8080
const backlog = () => {
    console.log(
    `Server => http://localhost:${port}`
    )
}

app.use(express.static(path.join(__dirname,"client")))
app.use("/img", express.static(path.join(__dirname,"img")))

app.get("/", (req,res) => {
  res.status(200).sendFile(path.join(__dirname,"client","index.html"))
})

app.get("/*",(req,res) => {
  res.status(404).sendFile(path.join(__dirname,"client","404.html"))
})


socket.on("connection", (con) => {
  // Create Room
  con.on("create_room", (data) => {
    if(!rooms[data.roomname]){
        rooms[data.roomname] = { 
	      users:[{ username: data.username, score: 0, ready: false, sid: con.id}],  
        turn_counter: 0,
        session:{},
        limit: 5, //[10,15,20,25,30][Math.floor(Math.random() * 5)],
	is_end: false
      }
      questions[data.roomname] = {
        question_list: [],
        current_question: {}
      }
      con.join(data.roomname)
        socket.to(data.roomname).emit('room_create_event',{
	        status:"success", 
          message: `Room created : ${data.roomname}`, 
          data: rooms[data.roomname],
          username: data.username,
         })
        } else {
          con.emit("room_create_event",{ status:"fail", message: `Room ${data.roomname}, Already Exists!` })
       }
    })

  // Join Room
  con.on("join_room", (data) => {
    if(rooms[data.roomname]){
      let doAdd = true
      rooms[data.roomname].users.forEach((u) => {
	    if(data.username == u){
	      doAdd = false
	     con.emit('room_join_event',{
	       status:"fail", message: `User ${data.username}, Already in Room!`
	      })
	   }
      });
  if(doAdd)
	  rooms[data.roomname].users.push({username: data.username, score: 0, ready: false, sid: con.id})
	  con.join(data.roomname)
	  socket.to(data.roomname).emit('room_join_event', {
	    status:"success" , 
	    message: `${data.username} Joined!`,
	    username: data.username,
    	    data: rooms[data.roomname]
	  })
    } else {
      con.emit('room_join_event',{
	        status:"fail", message: "Room Doesn't Exist!"
      })
    }
  })

  //Ready Player Event
  con.on("ready_player_signal",(data) => {
    const {username, room_id} = data
    //Reset
    if(rooms[room_id].is_end && data?.reset == true){
      rooms[room_id].session = {}
      rooms[room_id].limit = 5 //[10,15,20,25,30][Math.floor(Math.random() * 5)]
      rooms[room_id].is_end = false
      rooms[room_id].turn_counter = 0
      questions[room_id].current_question = {}
      questions[room_id].question_list = []
      rooms[room_id].users.forEach((e) => {
        e.score = 0
        e.ready = false
      })
      const copy_ = [...rooms[room_id].users]
      rooms[room_id].users = copy_.shuffle()
    }
    rooms[room_id] && rooms[room_id].users.forEach((e) => {
        if(e.username == username){
          e.ready = true
        }
      })
    // Check if minimum two players on ready state
    const ready_players = rooms[room_id] && rooms[room_id].users.filter((e) => e.ready === true )
    if(ready_players.length >= 2){
      const current_turn = rooms[room_id].users[rooms[room_id].turn_counter]
      socket.to(room_id).emit("player_turn_event", {
        status: "success",
        username: current_turn.username
      })
    }
    socket.to(room_id).emit("ready_player_receive", { status: "success" , data: rooms[room_id] })
  })

  // Get Player topic
  con.on("player_topic_event", async (data) => {
    socket.to(data.room_id).emit("is_loading", {
      status:"loading",
      topic: data.topic,
      limit: rooms[data.room_id].limit, 
      total_questions: questions[data.room_id].question_list.length
    })
    const ai_call = await Question(data.topic)
    const duplicate_question = {...ai_call}
    delete duplicate_question.answer
    questions[data.room_id].current_question = ai_call
    questions[data.room_id].question_list.push(ai_call)
    socket.to(data.room_id).emit("ai_question", {
      question: duplicate_question,
    })
    socket.to(data.room_id).emit("is_loading", {
      status:"loaded",
      topic: data.topic,
      limit: rooms[data.room_id].limit, 
      total_questions: questions[data.room_id].question_list.length
    })
        //Time limit of Backend
        rooms[data.room_id].session = setTimeout(() => {
          if(questions[data.room_id].question_list.length >= rooms[data.room_id].limit || rooms[data.room_id].is_end == true ){
            rooms[data.room_id].is_end = true
            socket.to(data.room_id).emit("end_game",{
                status:"success",
                room_id: data.room_id,
                scores: rooms[data.room_id].users.sort((a, b) => b.score - a.score)
            })
            clearTimeout(rooms[data.room_id].session)
            return
          }
          if(rooms[data.room_id].turn_counter == rooms[data.room_id].users.length - 1){
            rooms[data.room_id].turn_counter = 0
            } else {
            rooms[data.room_id].turn_counter += 1
          }
          const current_turn = rooms[data.room_id].users[rooms[data.room_id].turn_counter]
          socket.to(data.room_id).emit("player_turn_event", {
            status: "success",
            username:  current_turn.username
          })
        },25000)
  })

  // Check Answer
  con.on("check_answer", (data) => {
    const {username, room_id, option_id} = data
    if(questions[room_id].current_question.answer == option_id){
      clearTimeout(rooms[room_id].session)
      rooms[room_id].users.forEach((e) => {
        if(e.username == username){
          e.score += 1
        }
      })
      if(rooms[room_id].turn_counter == rooms[room_id].users.length - 1){
        rooms[room_id].turn_counter = 0
        } else {
        rooms[room_id].turn_counter += 1
      }
      socket.to(room_id).emit("receive_result", {
        username,
        status: "success",
        answer: questions[room_id].current_question.answer
      })
      if(questions[data.room_id].question_list.length >= rooms[data.room_id].limit || rooms[data.room_id].is_end == true ){
        rooms[data.room_id].is_end = true
        socket.to(data.room_id).emit("end_game",{
            status:"success",
            room_id: data.room_id,
            scores: rooms[data.room_id].users.sort((a, b) => b.score - a.score)
        })
        clearTimeout(rooms[data.room_id].session)
        return
      }
      setTimeout(() => {
        const current_turn = rooms[room_id].users[rooms[room_id].turn_counter]
        socket.to(room_id).emit("player_turn_event", {
          status: "success",
          username:  current_turn && current_turn.username
        })
      },3000)
    } else {
      socket.to(room_id).emit("receive_result", {
        username,
        status: "fail",
        answer: questions[room_id].current_question.answer
      })
    }
  })


  // Broadcast Emoji
  con.on("send_emoji", (data) => {
    socket.to(data.room_id).emit("receive_emoji", {
      username: data.username, emoji: data.emoji
    })
  })

  // Handle Disconnect
  con.on("disconnect",() => {
    const sid = con.id
    let room_id, count, username
    Object.entries(rooms).forEach(([key,value]) => {
      value.users.forEach((e) => {
        if(e.sid == sid ){
          room_id = key
          username = e.username
        } 
      })
    })
    if(room_id && username){
      rooms[room_id].users = rooms[room_id].users.filter((e) => e.username !== username) 
      count = rooms[room_id].users.length
      console.log(count, username)
      if(count <= 0){ delete rooms[room_id]; delete questions[room_id]; return}
      if(count > 0){
        socket.to(room_id).emit('room_disconnect_event',{
          status:"success", message: `${username}, Left the room!`, data: rooms[room_id]
         })
      } 
    }

  })

})

server.listen(port,hostname,backlog)
