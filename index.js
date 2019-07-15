require('./env')

const URL = process.env.URL
const TOKEN = process.env.TOKEN

const { google } = require('googleapis');
const TelegramBot = require('node-telegram-bot-api');
const cuba = require('cuba');

const bot = new TelegramBot(TOKEN, { polling: false })
const query = cuba(process.env.GSID)

const users = process.env.USERS

// ### Аутентификация пользователей ############################################
accessAllowed = (msg) => {
    var result = users.search(msg.chat.id) >= 0
    console.log("accessAllowed: %s", result, JSON.stringify(msg))

    if (!result) {
        bot.sendMessage(msg.chat.id, 'Тебя нет в списке пользователей - обратись к администратору бота')
        bot.sendMessage(process.env.ADMIN, 'К боту присоединился новый пользователь: ' + msg.chat.id)
    }

    return result
}

// ### Ответ на запрос #########################################################
respond = async (msg, find, res) => {
    var firstMessage = res.message_id
    var sql = 'select F, G, D, E, C where C contains "' + find + '" limit 7'
    console.log("QUERY: '%s'", sql)
    var result = await query(sql)
    console.log("RESULT:", JSON.stringify(result))
    if (result.length > 0) {
        for (var u in result) {
            var answer = JSON.stringify(result[u], null, ' ').replace(new RegExp('["{},]', 'g'), '')
            if (!firstMessage) {
                bot.sendMessage(msg.chat.id, answer)
            } else {
                bot.editMessageText(answer, { chat_id: msg.chat.id, message_id: firstMessage })
                firstMessage = undefined
            }
        }
    } else {
        bot.editMessageText("Ничего не нашел, попробуй - спроси иначе", { chat_id: msg.chat.id, message_id: res.message_id })
    }
}

// ### Точка входа нашего бота #################################################
exports.salutavtoTelegramBot = (req, res) => {
    console.log("FUNCTION:", JSON.stringify(req.body))
    bot.processUpdate(req.body)
    res.sendStatus(200)
}

// ### Запуск ##################################################################
var debug = false; process.argv.forEach((val, index, array) => { if (val === 'debug') { debug = true; }});
if (debug) { 
    bot.deleteWebHook()
    bot.startPolling()
 } else { 
     bot.setWebHook(`${URL}/bot${TOKEN}`) 
}

// ### Пишем запросы в лог #####################################################
bot.on('message', (msg) => { 
    console.log("CONTEXT:", JSON.stringify(msg))
})

// ### Обработка запроса #######################################################
bot.onText(/.+/, (msg) => {
    console.log("MESSAGE:", JSON.stringify(msg))
    if (accessAllowed(msg)) {
        if (msg.text.match(/\/start/i)) {
            bot.sendMessage(msg.chat.id, 'Укажи номер автомобиля')        
        } else {
            bot.sendMessage(msg.chat.id, "Минуту...").then(res => { respond(msg, msg.text.replace(/[^0-9А-яA-z]/g, ''), res) })
            
        }
    }
})

// ### Здороваюсь ##############################################################
bot.sendMessage(process.env.ADMIN, "Работаю")
