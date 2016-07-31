// token=TOKEN_GOES_HERE node bot.js 

if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('Botkit');
var os = require('os');

var controller = Botkit.slackbot({
    debug: false
});

var bot = controller.spawn({
  token: process.env.token
}).startRTM(function(err) {
  if (err) {
    throw new Error(err);
  }
});


var order_status_placed = 'placed';
var order_status_cancelled = 'cancelled';


controller.hears(['i would like (.*)', 'make me (.*)', 'please make me (.*)', 'i want (.*)', 'could i please get (.*)'],['direct_message'],function(bot, message) {
	
	controller.storage.teams.get(message.user, function(err, existing_order) {
		if (orderIsActive(existing_order)) {
			bot.reply(message, "You already have an order in progress.  You can only have one order at a time.");
		} else {
			
			bot.api.users.info({user: message.user}, function(err, response) {
                if (err) {
					bot.reply(message, "There was a problem placing your order.");
                } else {
	                
					var new_order = {
						id: message.user,
						order: message.match[1],
						name: response.user.real_name,
						status: order_status_placed
					};
					
					controller.storage.teams.save(new_order, function(err) {
						if (err) {
							bot.reply(message, "There was a problem placing your order.");
						} else {
							bot.reply(message, "Okay! Your order has been placed!");
						}
					});
                }
            });
		}
	});
});

controller.hears(['what did i order'],['direct_message'],function(bot, message) {
	
	controller.storage.teams.get(message.user, function(err, existing_order) {
		if (orderIsActive(existing_order)) {
			bot.reply(message, "You have an order of \"" + existing_order.order + "\" which is in status \"" + existing_order.status + "\".");
		} else {
			bot.reply(message, "You don't currently have an order in progress.");
		}
	});
});

controller.hears(['cancel my order', 'cancel', 'cancel my drink'],['direct_message'],function(bot, message) {
	
	controller.storage.teams.get(message.user, function(err, existing_order) {
		if (orderIsActive(existing_order)) {
			bot.startConversation(message,function(err,convo) {
			    convo.ask('Are you sure you want to cancel your order?',[
			    {
			        pattern: bot.utterances.yes,
			        callback: function(response,convo) {
				        
				        var cancelled_order = existing_order;
				        cancelled_order.status = order_status_cancelled;
				        
				        controller.storage.teams.save(cancelled_order, function(err) {
							if (err) {
								bot.reply(message, "There was a problem placing your order.");
							} else {
								bot.reply(message, "Okay! Your order has been cancelled.");
							}
							convo.next();
						});
					}
				},
				{
					pattern: bot.utterances.no,
					callback: function(response,convo) {
						convo.say('Okay.');
						convo.next();
					}
				},
				{
					default: true,
					callback: function(response,convo) {
						convo.repeat();
						convo.next();
					}
				}
				]);
			});
		} else {
			bot.reply(message, "You don't currently have an order in progress.");
		}
	});
});

controller.hears(['help'],['direct_message'],function(bot, message) {
	bot.reply(message, "If you would like to order a coffee, please just say \"i would like\" followed by your order.");
});

controller.hears(['all orders'],['direct_message'],function(bot, message) {
	controller.storage.teams.all(function(err, all_team_data) {
		bot.reply(message, 'here are all of the current orders: ' + JSON.stringify(all_team_data, null, '\t'));
	});
});

function orderIsActive(order) {
	return order &&
			order.status == order_status_placed;
}
