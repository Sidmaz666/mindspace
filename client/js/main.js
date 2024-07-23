let USERNAME
let ROOMID
let QUESTION
let AUDIO
const socket = io()


window.onload = function(){
    __init__();
    check_roomid_in_url();
    AUDIO = new Audio("./audio/notification.wav")
}

function __init__(){
    // Initialize Service Worker
    if("serviceWorker" in navigator){
        navigator.serviceWorker.register("service-worker.js").then(registration=>{
        console.log("Service Worker Registered!");
    }).catch(error=>{
      console.log("Service Worker Registration Failed!" , {error:error});
        });
    } else {
	  console.log("Service Worker not supported!");
     }
    const is_user = check_get_username()
    if(is_user){
        document.querySelector("#username-input").value=is_user
        USERNAME=is_user
        document.querySelector("#username-display").innerHTML=""
        document.querySelector("#username-display").insertAdjacentHTML("beforeend",`
            <span class="underline">user: ${is_user}</span>    
        `)
        document.querySelector("#username-display").classList.remove('hidden')
        document.querySelector("#submit-username-btn").textContent = "change"
        set_robo_img(is_user)
    }
}

function check_roomid_in_url(){
    const id = new URLSearchParams(window.location.search).get("room_id")
    if(id == null) return
    document.querySelector("#room-id-input").value = id
    ROOMID = document.querySelector("#room-id-input").value 
    if(USERNAME && USERNAME.length > 2 && ROOMID.length > 5){
        join_room()
        return
    } 
    notify("Please Enter Your Name and Join!")
}

function set_robo_img(username){
        document.querySelector("img#user-image").src=`https://robohash.org/${username}?set=set3`
}

function check_get_username(){
    const name = localStorage.getItem("username")
    if(name !== null && name.length > 2){
        return name
    } 
    return false
}

function handle_username_input(e){
    if(e.value.length > 0){
        document.querySelector('img#user-image').src=`https://robohash.org/${e.value}?set=set3`
    } else {
        document.querySelector('img#user-image').src=`https://robohash.org/random?set=set3`
    }
}

function submit_username(){
    const input_ = document.querySelector('#username-input')
    if(input_.value.length > 2){
        localStorage.setItem("username",input_.value.replaceAll(" ",""))
        __init__()
    }
}

function gen_room(){
    if(check_get_username()) document.querySelector("#room-id-input").value = "mindspace_room_" + crypto.randomUUID().replaceAll("-","").slice(0,10)
}

function notify(message, iconClass="fa-regular fa-bell", timeout=8000){
    let TIMEOUT__
    AUDIO.play()
    if(document.querySelector(`#notification`)) document.querySelector(`#notification`).remove()
        document.querySelector('main').insertAdjacentHTML("beforeend",`
            <div
                id="notification"
                class="absolute top-2 left-0  flex flex-col space-y-2 justify-center items-center w-full z-[9999]">
                <div 
                onclick="document.querySelector('#notification').remove()"
                class="p-4 border border-[#c936c5] bg-[#190132] text-[#c936c5] cursor-pointer
                 flex space-x-2 items-center tracking-wide font-mono font-bold relative">
                 <i class="${iconClass}"></i> <span>${message}</span>
                </div>
            </div>
        `)
       TIMEOUT__ = setTimeout(() => {
            if(document.querySelector(`#notification`)) document.querySelector(`#notification`).remove()
            clearTimeout(TIMEOUT__)
        },timeout)
}

function copy_link(text) {
    navigator.clipboard.writeText(text);
    notify("Join Link Copied to Clipboard!");
  }

// Socket Room Create/Join Function
function create_room() {
    ROOMID = document.querySelector("#room-id-input").value
    if(USERNAME.length > 2 && ROOMID.length > 5){
        document.querySelector("#create-room-btn").disabled=true
        document.querySelector("#join-room-btn").disabled=true
        document.querySelector("#create-room-btn").textContent="Creating..."
        socket.emit("create_room", {
            username: USERNAME,
            roomname: ROOMID,
          });
    }
}

function join_room() {
    ROOMID = document.querySelector("#room-id-input").value
    if(USERNAME.length > 2 && ROOMID.length > 5){
    document.querySelector("#join-room-btn").disabled=true
    document.querySelector("#create-room-btn").disabled=true
    document.querySelector("#join-room-btn").textContent="Joining..."
    socket.emit("join_room", {
      username: USERNAME,
      roomname: ROOMID
    });
  }
}

function render_game_screen(data){
    const setup_screen = document.querySelector("#setup-page")
    const gamne_screen = document.querySelector("#game-page")
    const invite_btn = document.querySelector("#invite-btn")
    //Update Invite Button
    invite_btn.addEventListener("click", function(e){
        copy_link(`${window.location.origin}?room_id=${ROOMID}`)
    })
    // Update User details
    update_user_details(data)
    //Update Participants
    render_participants(data)
    // Show/Hide the screen
    setup_screen.classList.add("hidden")
    gamne_screen.classList.remove("hidden")
}

function update_user_details(data){
    const user_details = data.data.users.filter((e) => e.username == USERNAME )
    const user_status_img = document.querySelector("#user-status-img")
    const user_status_name = document.querySelector("#user-status-name")
    const user_status = document.querySelector("#user-status-status")
    user_status_img.src=`https://robohash.org/${USERNAME}?set=set3`
    user_status_name.textContent = USERNAME
    user_status.textContent = user_details[0].ready ? 'online' : 'not yet ready'
}

function render_participants(data){
    const participants = data.data.users.filter((e) => e.username !== USERNAME)
    const participant_container = document.querySelector("#participants-container")
    if(participants.length > 0){
        participant_container.innerHTML = ""
        participants.forEach((e) => {
            const htmlString = `            
            <div
                id="${e.username}-card" 
                class="bg-[#19013280] backdrop-blur-sm text-[#c936c5] p-2 flex items-center border-b-2 border-[#c936c590]">
                <img src="https://robohash.org/${e.username}?set=set3" 
                class="h-[60px] w-[60px] rounded-full border-2 border-[#c936c5] "/>
                <div class="flex flex-col justify-start items-start space-y-2 pl-2">
                    <span class="font-mono font-bold tracking-wider uppercase px-2 rounded-full bg-[#c936c5] text-[#190132]">
                        ${e.username}
                    </span>    
                    <span class="text-xs font-mono font-bold tracking-wider uppercase">
                    ${e.ready ? 'online' : 'not yet ready'}
                    </span>
                </div>
                <span class="p-2 rounded-full mr-4 ${e.ready ? 'bg-[#c936c5]' : 'bg-orange-600'} text-[#190132] ml-auto font-bold 
                font-mono tracking-wider uppercase 
                border border-[#c936c5]">
            </span>
            </div>`
            participant_container.insertAdjacentHTML("beforeend",htmlString)
        });
    } else {
        participant_container.innerHTML = `
                <span class="text-[#c936c5] font-mono w-full text-center py-4 font-bold tracking-wider uppercase">
                    No participants!
                </span>  
        `
    }
}

function ready_player_signal(ui_change=true){
    if(ui_change){
        const ready_btn = document.querySelector("#user-ready-btn")
        const htmlString = `
            <span class="p-2 rounded-full mr-4 bg-[#5ed476] text-[#190132] ml-auto font-bold 
             font-mono tracking-wider uppercase">
        `
        const user_status = document.querySelector("#user-status-status")
        ready_btn.insertAdjacentHTML("afterend", htmlString)
        ready_btn.remove()
        user_status.textContent = "online"
        socket.emit("ready_player_signal", {username:USERNAME, room_id:ROOMID} )
    } else {
        const target = document.querySelector("#play-again-btn")
        target.classList.add("hidden")
        target.disabled=true
        socket.emit("ready_player_signal", {username:USERNAME, room_id:ROOMID, reset:true } )
        display_loader("please wait while others are getting ready")
    }
}

function submit_topic(e){
    const topic_input = document.querySelector("#topic-input-container > input")
    const topic_button = document.querySelector("#topic-input-container > button")
    if(e.type == "keydown"){
        if(e.key == "Enter" && topic_input.value.length > 2){
        socket.emit("player_topic_event", { topic: topic_input.value, room_id:ROOMID })
        topic_input.disabled = true
        topic_input.placeholder = "wait for your turn"
        topic_button.disabled = true
        topic_input.removeEventListener("keydown",submit_topic)
        topic_button.removeEventListener("click",submit_topic)
        }
    } 
    if(e.type == "click" && topic_input.value.length > 2){
            socket.emit("player_topic_event", { topic: topic_input.value, room_id:ROOMID  })
            topic_input.disabled = true
            topic_input.placeholder = "wait for your turn"
            topic_button.disabled = true
            topic_input.removeEventListener("keydown",submit_topic)
            topic_button.removeEventListener("click",submit_topic)
    }
}

//Handle Emoji
// Emoji Settings
const pickerOptions = {
    onEmojiSelect: select_emoji,
    previewPosition: "none",
    skinTonePosition: "none",
    perLine: 10,
    onClickOutside: close_emoji,
    emojiButtonSize: 30,
    emojiSize: 25,
};
const picker = new EmojiMart.Picker(pickerOptions);
document.querySelector("#emoji-picker-container").appendChild(picker);
// Emoji Functions
function select_emoji(data) {
    document.querySelector("#emoji-picker-container").classList.add("hidden");
    socket.emit("send_emoji", {
      username: USERNAME,
      room_id:ROOMID,
      emoji: data.native,
    });
}

function show_emoji() {
    if(document.querySelector("#emoji-picker-container").classList.contains("hidden")){
        document.querySelector("#emoji-picker-container").classList.remove("hidden");
    } else {
        document.querySelector("#emoji-picker-container").classList.add("hidden");
    }
}

function close_emoji(data) {
    console.log(data)
    const emoji_btn = document.querySelector("#emoji_icon")
    if (data.target.tagName.toLowerCase() !== "path" && data.target.id !== "emoji_icon" && !emoji_btn.contains(data.target)){
        document.querySelector("#emoji-picker-container").classList.add("hidden");
    }
}

function render_emoji(data){
    let TIMEOUT_EMOJI 
    if(document.querySelector(`#emoji-${data.username}`)) document.querySelector(`#emoji-${data.username}`).remove()
    const emoji_drop = document.querySelector("#emoji_drop")
    const htmlString = `
        <div id="emoji-${data.username}" 
           class="px-4 rounded-full font-mono font-bold tracking-wider bg-[#c936c5]
           text-[#190132] flex items-center space-x-2">
            <span>${data.username}</span>
            <span class="">${data.emoji}</span>
        </div>
    `
    emoji_drop.insertAdjacentHTML("afterbegin",htmlString)
    TIMEOUT_EMOJI = setTimeout(() => {
        if(document.querySelector(`#emoji-${data.username}`)) document.querySelector(`#emoji-${data.username}`).remove()
        clearTimeout(TIMEOUT_EMOJI)
    },5000)
}

//Update Topic
function update_topic(data){
    const topic_span = document.querySelector("#topic-span")
    topic_span.textContent = data.topic
}

function update_question_count(data){
    const target = document.querySelector("#total-question")
    target.textContent = `${data.total_questions}/${data.limit}`
}

function display_loader(prompt="please wait while we are loading the question"){
    document.querySelector(`#question-container`).style.opacity="100%"
    const target = document.querySelector("#question-container")
    const htmlString = `
                    <div class="pyramid-loader">
                      <div class="wrapper">
                          <span class="side side1"></span>
                          <span class="side side2"></span>
                          <span class="side side3"></span>
                          <span class="side side4"></span>
                          <span class="shadow"></span>
                        </div>  
                      </div>
                      <span 
                      class="-translate-y-32 text-lg font-bold font-mono text-[#c936c595] uppercase">
                        ${prompt}
                    </span>
    `
    target.innerHTML = ""
    target.insertAdjacentHTML("beforeend", htmlString)
}

let TIMER
function display_question(){
    clearInterval(TIMER)
    const target = document.querySelector("#question-container")
    const htmlQuestions = []
    QUESTION.options.forEach((q) => {
        htmlQuestions.push(`
        <span class="p-2 bg-[#c936c5]" id="answer-id-${q.option_id}">
        <label class="checkbox-container flex">
            <input onclick="submit_answer('${q.option_id}')" value="${q.option_id}" type="radio" name="user-answer-selected">
            <div class="checkmark"></div>
            <span 
            class="p-0 pl-5 text-lg font-bold font-mono text-[#190132]"
            >${q.option_text}</span>
        </label>
        </span>
        `)
    })
    const htmlString = `
        <div class="flex flex-col w-full justify-start space-y-2 px-28">
                <div class="flex items-center justify-center space-x-2">
                        <i class="fa-regular fa-hourglass-half text-[#c936c5] "></i>
                        <span id="timer" class="font-bold font-mono text-[#c936c5] tracking-wider">20s</span>
                </div>
            <span class="py-2 text-2xl font-bold font-mono text-[#c936c5] w-full text-start uppercase">
                ${QUESTION.question}
            </span>
            ${htmlQuestions.join("")}
        </div>
    `
    target.innerHTML = ""
    target.insertAdjacentHTML("beforeend", htmlString)
    const timer_target = document.querySelector("#timer")
    let x = 20 
    TIMER = setInterval(() => {
        if(x <= 0){
            display_loader("you ran out of time to answer")
            clearInterval(TIMER)
        }  
        timer_target.textContent = `${x}s`
        x -= 1;
    },1000)
}

function submit_answer(option_id){
    //disable
    clearInterval(TIMER)
    const timer_target = document.querySelector("#timer")
    timer_target.textContent = option_id ? "Checking..." : "Done!"
    document.querySelectorAll("[name=user-answer-selected]").forEach((e) => {
        e.disabled=true
    })
    document.querySelector(`#question-container`).style.opacity="50%"
    if(!option_id) return
    socket.emit("check_answer", {
        username : USERNAME,
        room_id: ROOMID,
        option_id: option_id
    })
}

// Room Creation Event Listener
socket.on("room_create_event", (data) => {
    notify(data.message)
    if(data.status !== "success"){
        document.querySelector("#create-room-btn").disabled=false
        document.querySelector("#join-room-btn").disabled=false
        document.querySelector("#create-room-btn").textContent="create room" 
        return
    }
    render_game_screen(data)
})

socket.on("room_join_event", (data) => {
    notify(data.message)
    if(data.status !== "success"){
        console.log("ae")
        document.querySelector("#join-room-btn").disabled=false
        document.querySelector("#create-room-btn").disabled=false
        document.querySelector("#join-room-btn").textContent="join room" 
        return
    } 
    render_game_screen(data)
})

// Handle Disconnect
socket.on("room_disconnect_event", (data) => {
    notify(data.message)
    render_participants(data)
})

socket.on("ready_player_receive", (data) => {
    render_participants(data)
})

socket.on("player_turn_event", (data) => {
  const topic_input = document.querySelector("#topic-input-container > input")
  const topic_button = document.querySelector("#topic-input-container > button")
  if(data.username == USERNAME){
    notify("Your Turn, please enter a prompt!")
    topic_input.value = ""
    topic_input.disabled = false
    topic_input.placeholder = "enter your thoughts"
    topic_button.disabled = false
    topic_input.addEventListener('keydown', submit_topic)
    topic_button.addEventListener('click', submit_topic) 
  } else {
    topic_input.disabled = true
    topic_input.placeholder = "wait for your turn"
    topic_button.disabled = true
    topic_input.removeEventListener("keydown",submit_topic)
    topic_button.removeEventListener("click",submit_topic)
  } 
})

socket.on("receive_emoji", (data) => {
    render_emoji(data)
})

socket.on("is_loading", (data) => {
    update_topic(data)
    update_question_count(data)
    if(data.status == "loading") display_loader()
    if(data.status == "loaded") display_question()
})

socket.on("ai_question", (data) => {
    QUESTION = data.question
})

socket.on("receive_result", (data) => {
    if(data.status == "success"){
        // Disable for all users
        submit_answer(false)
        clearInterval(TIMER)
        // High light the Correct Answer
        if(data.username == USERNAME){
            document.querySelector(`#answer-id-${data.answer}`).style.background = "#5ed476"
            document.querySelector(`#timer`).textContent = "You Answered!"
        } else {
            document.querySelector(`#timer`).textContent = "Someone Answered!"
        }
    } 
    if(data.status == "fail"  && data.username == USERNAME){
        // Disable Only
        submit_answer(false)
        //Highlight the wrong answer
        document.querySelectorAll("[name=user-answer-selected]").forEach((e) => {
            if(e.checked) document.querySelector(`#answer-id-${e.value}`).style.background = "#c12";
        })
        // High light the Correct Answer
        document.querySelector(`#answer-id-${data.answer}`).style.background = "#5ed476"
    }  
})

socket.on("end_game", (data) => {
    notify("Game Over!");
    const target = document.querySelector("#play-again-btn")
    target.classList.remove("hidden")
    target.disabled=false
    document.querySelector("#question-container").innerHTML = ""
    document.querySelector("#question-container").style.opacity = "100%"
    const topic_input = document.querySelector("#topic-input-container > input")
    const topic_button = document.querySelector("#topic-input-container > button")
    topic_input.disabled= true
    topic_button.disabled = true
    const scoreCards = []
    data.scores.forEach((u, i) => {
        scoreCards.push(`
            <div 
            class="text-[#190132] bg-[#c936c5] p-2
                border-2 
                ${
                    i == 0 && data.scores[i >= data.scores.length - 1 ? i - 1 : i + 1] !== i ? 'border-green-500' : ''
                }
                ${
                    i == 1 && data.scores[i >= data.scores.length - 1 ? i - 1 : i + 1] !== i  ? 'border-yellow-500' : ''
                }
                ${
                    i == 2 && data.scores[i >= data.scores.length - 1 ? i - 1 : i + 1] !== i  ? 'border-blue-500' : ''
                }
                ${i !== 0 && i !== 1 && i !== 2 ? 'border-[#00000000]' : ''}
                w-full flex justify-between items-center ">
                <img
                class="w-[60px] h-[60px] rounded-full bg-[#190132]" 
                src="https://robohash.org/${u.username}?set=set3"
                />
                <div class="w-full flex justify-between p-2">
                    <div class="flex flex-col">
                        <span class="uppercase rounded-full bg-[#190132]
                         text-[#c936c5] px-2 w-[min-content] font-bold font-mono tracking-wider">${u.username.trim()}</span>
                        <span class="uppercase px-2 pt-0.5  text-[#190132] font-bold font-mono tracking-wider text-sm">score : ${u.score}</span>
                    </div>
                    <div class="flex items-center sapce-x-2">
                    ${
                        i == 0  && data.scores[i >= data.scores.length - 1 ? i - 1 : i + 1] !== i  ? "<span class='text-lg text-[#190132] font-bold font-mono tracking-wider px-2'>1st</span> <img class='w-[20px] h-[20px]' src='./img/star.png'/> <img class='w-[20px] h-[20px]' src='./img/star.png'/> <img class='w-[20px] h-[20px]' src='./img/star.png'/>" : ''
                    }
                    ${
                        i == 1  && data.scores[i >= data.scores.length - 1 ? i - 1 : i + 1] !== i  ? "<span class='text-lg text-[#190132] font-bold font-mono tracking-wider px-2'>2nd</span>  <img class='w-[20px] h-[20px]' src='./img/star.png'/> <img class='w-[20px] h-[20px]' src='./img/star.png'/>" : ''
                    }
                    ${
                        i == 2  && data.scores[i >= data.scores.length - 1 ? i - 1 : i + 1] !== i  ? "<span class='text-lg text-[#190132] font-bold font-mono tracking-wider px-2'>3rd</span>  <img class='w-[20px] h-[20px]' src='./img/star.png'/> " : ''
                    }
                    </div>
                </div>
            </div>
        `)
    })
    const cardContainer = `
    <div class="flex flex-col items-start w-full overflow-y-auto max-h-full h-full pt-5 no-scrollbar">
    <span class="pb-4 flex items-center justify-center w-full space-x-2 text-lg font-mono
     font-bold tracking-wider uppercase text-[#c936c5] bg-[oklch(var(--b1)/1)] sticky top-0  ">
       <i class="fa-solid fa-trophy"></i> <span>leaderboard</span>
    </span>
        <div class="flex flex-col space-y-2 items-center px-32 justify-start w-full h-full max-h-full">
            ${scoreCards.join("")}
        </div>
    <div>
    `
    document.querySelector("#question-container").insertAdjacentHTML("beforeend",cardContainer)
})