---
title: How I rented a nice place to live using Elixir and a Facebook Messenger chat bot
description: An apartment hunt in Porto, helped along by a small Elixir bot.
date: '2018-02-18'
label: '2018'
original: https://medium.com/@DFilipeS/how-i-rented-a-nice-place-to-live-using-elixir-and-a-facebook-messenger-chat-bot-836f79498c5c
platform: Medium
order: 3
---
![](/images/fc793b674440e911.jpg)

Photo by [Diogo Palhais](https://unsplash.com/@diogopalhais?utm_source=medium&utm_medium=referral) on [Unsplash](https://unsplash.com/?utm_source=medium&utm_medium=referral)

Renting a place to live in Porto is hard these days.

This all started a few months ago when me and my girlfriend first started to search for a nice apartment near Porto to start our lives together. We had some demands regarding the house: close to the subway, fairly close to the city center, a garage, … And of course, a good price.

Everyday we went through the routine of checking multiple classified advertisements websites, looking for apartments that matched our criteria. When we found a posting that we liked, we then rushed to call to schedule a visit. And, unfortunately, the outcome would be that the house was already rented or reserved. Generally, good houses would be rent on the same day of the advertisement posting or the first day that allowed visits. We started checking the same websites everyday, first thing in the morning. But still, the outcome would be the same every time. Finding a nice place to live started to look like an **impossible task**. We needed to change tactics.

## There must be a better way

![](/images/f79b42def7da8eb5.gif)

I am a software engineer, I am used to make the impossible… **possible**. We just need to **identify our problem**, think of a **possible solution** and **execute**. If we fail, **try again**. That is pretty much what I do every single day, why not apply it to my house search.

Our problem was pretty clear, other people were being faster checking advertisements and contacting the ad poster than I was. So I decided to become the faster shooter in the west.

What if I had some software to check the websites that I usually go through everyday, find the new postings as they are posted and notify me. If I find anything that I find interesting, I can contact the advertisement poster as soon as possible.

I needed to put plan in motion but I did not want to waste too much time on something that might not work as I intended. I had the perfect tools for the job: [**Elixir**](https://elixir-lang.org/), the [**Phoenix framework**](http://phoenixframework.org/) and [**Facebook Messenger chat bots**](https://developers.facebook.com/docs/messenger-platform). My plan was to create a simple web scrapper to go through the classified advertisements websites, get the metadata for the advertisements matching my search criteria, store them, get the new ones and notify me through a chat bot in Facebook Messenger. I knew that with the available tools I had, I could put something together in just a couple of hours.

## Putting the plan in motion

First step, creating a new project. I decided to create Phoenix project as an umbrella project. An umbrella in Elixir is just a way of organizing a project into different standalone modules that depend on each other. This way, it is pretty straightforward to use parts of the project in other applications. It is also a very neat way of separating the components of your application into very organized, reusable and easy to understand modules.

```
mix phx.new --umbrella rent_bot
```

Phoenix is pretty cool and gives us a ready to use project with everything we need, from the basic functionality of a web application of receiving and responding to requests, database configuration, unit tests and some documentation.

## Crunching HTML all day long

The real work started now. I decided to start by the web scraping of one of the classified advertisements websites and see how much effort was needed to get the metadata that I need.

First of all, I needed to know how could I reliably get the page with advertisements with the all of the filters for my search and also how I could programatically navigate through the multiples pages of results in the search of this sites. It turns out that, generally, when you make a search all the filters and the page for the pagination are on the URL as parameters. That way, I just needed to get the URL with the parameters for the filters I wanted and the page I could increment until I wouldn’t get any result.

```
https://www.randomwebsite.com/arrendar/apartamento/porto/?search%5Bfilter_float_price%3Ato%5D=600&search%5Bdescription%5D=1&page=1
```

Next, I needed to process the HTML of that page. I did a quick search for HTML parsing libraries for Elixir and I found [Floki](https://github.com/philss/floki). Floki parses the given HTML and allows me to search for the desired DOM elements using regular CSS selectors. Just what I needed!

I had an HTML parsing library, but Floki is only just that. You still need to get the HTML and pass it to the library. For that I used the popular [HTTPoison](https://github.com/edgurgel/httpoison) library that allows you to make HTTP requests in Elixir.

With every tool I needed, I just needed to write some functions make the HTTP request to the website I wanted, pass the HTML from the response to Floki and find the elements of every advertisement in the page and in each one of those elements, get the metadata. It turns out it is pretty simple to do all of that with the power of Elixir and the available libraries.

```elixir
def import(page \\ 1) do
  base_url = "..."
  url = "#{base_url}&page=#{page}"
  
  url
  |> get_page_html()
  |> get_dom_elements()
  |> extract_metadata()
end
```

It almost looks like pseudo-code but Elixir gives an incentive to write small and descriptive functions that allow everyone to quickly understand the basic logic of the application. In this case we are creating a function called `import` that a page number as argument. In the first line of the function we are creating a string with the base URL and the page number. Then, using the awesome [pipe operator](https://elixirschool.com/en/lessons/basics/pipe-operator/), we first give the URL we created to a function called `get_page_html`. We don’t know how that functions is implemented, but we can make a pretty good guess that that function makes the HTTP request to get the HTML of the page in that URL.

```elixir
defp get_page_html(url) do
  %HTTPoison.Response{body: body} = HTTPoison.get!(url, [], follow_redirect: true)
  body
end
```

It turns out that it does just that! In two lines of code! That functions returns the body of the request, in this case is the HTML of the requested page.

The next function in the pipe is the `get_dom_elements`. Also, just by looking the at the function name, we can guess that in that function the HTML will be parsed and search for the target elements that match our CSS selectors. Remember that the input of this function in the output of the previous function in the pipe operator, the `get_page_html` function that returned the HTML of the page.

```elixir
defp get_dom_elements(body) do
  Floki.find(body, "div.col-md-content > article.offer-item")
end
```

How cool is this? You can parse and get the DOM elements you need in one line of code!

The last function in the pipe is the `extract_metadata` function. And you guess it, it process the DOM elements found and somehow extracts the metadata.

```elixir
defp extract_metadata(elements) do
  Enum.map(elements, fn {"article", attrs, content} ->
    %{
      title: title(content),
      url: url(attrs),
      price: price(content),
      image: image(content),
      provider: "Website XPTO"
    }
  end)
end

defp title(html) do
    [{"span", _attrs, [title]}] = Floki.find(html, "div.offer-item-details > header > h3 span.offer-item-title")
    [{"p", _attrs, [subtitle]}] = Floki.find(html, "div.offer-item-details > header > p")
    "#{String.trim(title)} - #{String.trim(subtitle)}"
end

defp url(attrs) do
  ...
end

defp price(html) do
  ...
end

defp image(html) do
  ...
end
```

This function looks more complex but after you analyze it it turns out to be much more simple than it looks. We receive a list of DOM elements from the previous function (the `get_dom_elements` function). So we iterate through the list of elements with the Elixir’s [Enum.map](https://hexdocs.pm/elixir/Enum.html#map/2) function. It is a normal mapping function, similar to what you would find in [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) or [Java](https://docs.oracle.com/javase/8/docs/api/java/util/stream/Stream.html#map-java.util.function.Function-). So, for each element in our list we are applying a transformation creating a new list with the transformed elements. This transformation is the creation of regular Elixir [map data structure](https://hexdocs.pm/elixir/Map.html) with the title, URL, price, image URL (if available) and the name of the provider website where this data came from. You can see helper functions for each field (except the provider) that just do another search for the desired information in the given DOM element.

```elixir
[
  %{
    image: "https://imovirtualpt-images.akamaized.net/images_imovirtualpt/8230069_1_655x491_clerigos-rua-de-tras-7-t0-para-recuperar-ideal-para-turismo-porto.jpg",
    price: "450 € /mês",
    provider: "Imovirtual",
    title: "Clérigos - Rua de trás. 7 T0 para recuperar. Ideal para turismo - Apartamento para arrendar: Cedofeita, Santo Ildefonso, Sé, Miragaia, São Nicolau e Vitória, Porto",
    url: "https://www.imovirtual.com/anuncio/clerigos-rua-de-tras-7-t0-para-recuperar-ideal-para-turismo-IDDuo1.html#8b4cb03301"
  },
  ...
]
```

And that is it, we have a list of houses to rent!

![When you feel shit is getting done](/images/f8cc7c75a0dc94b4.gif)

The beauty of all the code I did so far is that with some minor changes to the elements to search in the DOM, everything else is the same for other websites I want to search.

With that, the next step is to find a way to schedule a task to run regularly to check for new entries in all of the websites. With another quick search for an Elixir library for task scheduling, I found [Quantum](https://github.com/c-rack/quantum-elixir). Quantum allows me to schedule recurrent tasks using [Cron-like notation](https://en.wikipedia.org/wiki/Cron).

```elixir
config :rent_bot_web, RentBotWeb.Scheduler,
  jobs: [
    {"*/5 * * * *", {RentBotWeb.Tasks.XYZ, :import_ads, [1]}},
    ...
  ]
```

In my configuration file, I’ve created a new task scheduler for each of the provider websites I wanted to search for advertisements. Each task is configured to every five minutes, run the function `import_ads` of the given module (`RendBotWeb.Tasks.XYZ`) with the given arguments (the list `[1]` argument is the page number to start the search).

```elixir
def import_ads(page \\ 1) do
  Logger.info("Checking XYZ for updates...")
  case Crawler.XYZ.import(page) do
    [] ->
      :stop
    entries ->
      new_entries = process_entries(entries)
      if (length(new_entries) > 0) do
        notify_subscribers(new_entries)
        import_ads(page + 1)
      end
  end
end
```

As you can see, even this function is pretty simple after you analyze it. We start by doing some logging to the console to notify the start of the task. We then call our import function that we built before specifying the page number we want to search. Then we have a condition, if the returned list from that function is an empty list, we stop the process. Otherwise, we take the return list and give it to a `process_entries` function. Again, naming is important to make your code readable. Just by looking at the code, you can guess that the `process_entries` function will do some processing on our list and return a new list with just the entries that are new.

```elixir
defp process_entries(entries) do
  entries
  |> Enum.map(&insert_entry/1)
  |> Enum.filter(fn x -> x != nil end)
end

defp insert_entry(entry) do
  case RentBot.Ads.get_ad_by_url(entry.url) do
    nil -> RentBot.Ads.create_ad(entry)
    _other -> nil
  end
end
```

And of course it does just that! It maps over the entries list and passes each entry to the `insert_entry` function. That function takes the entry and first queries the database to see if that entry is already there. If it is, it return `nil`, otherwise inserts the entry in the database and returns it. The final step of the `process_entries` function is the a filter for the `nil` values in the list.

Going back to the `import_ads` function, we then see if the new entries list has more than zero elements, we call a `notify_subscribers` function and continue the importing process to the next page of results. Wait, who are these subscribers anyway?

## Finally, a Facebook Messenger chat bot

Creating a Facebook Messenger bot is pretty straightforward. On your application, you just need two endpoints. An endpoint to receive a [GET request to validate the application](https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup) and another endpoint to receive POST requests with the messages for your bot.

[Creating and validating your application](https://developers.facebook.com/docs/messenger-platform/getting-started/app-setup) in the Facebook Developers platform is also pretty easy and painless.

The validation endpoint is pretty easy to implement. You need a random string of your choosing to be your verification token. In the Facebook Developer App settings, you put that verification token. When asked to validate your application, Facebook will send a GET request with your verification token and some other parameters. One of those parameters is the `hub.challenge` parameter. Your endpoint should return the value of that parameter as response.

As everything else in Elixir, it is pretty easy to do that.

```elixir
def webhook(conn, %{"hub.mode" => mode, "hub.verify_token" => token, "hub.challenge" => challenge}) do
  verify_token = Application.get_env(:rent_bot_web, RentBotWeb.BotController)[:facebook_messenger_verify_token]
  
  if (mode == "subscribe" and token == verify_token) do
    IO.inspect("Webhook verified")
    send_resp(conn, 200, challenge)
  else
    send_resp(conn, 403, "Unauthorized")
  end
end
```

As you can see in this code snippet, we use pattern matching right on the function parameters to get just what we need from the given parameters. On the first line of the function, we get the verify token from the project configuration file. Using that, we compare it with the verify token sent on the request and if it matches, we respond with the challenge parameter value and a 200 status code. Otherwise, the request is unauthorized. Pretty neat!

All that is left is to handle the POST requests with the messages incoming for the bot. In the context of our application, the bot is just listening for some specific test to register the user as a subscriber. This way, we can store a unique ID created for the user that is interacting with our bot and use it to send messages back at any time.

```elixir
def incoming_message(conn, %{"object" => object, "entry" => entries}) do
  if (object == "page") do
    Enum.each(entries, fn entry ->
      %{"message" => %{"text" => text}, "sender" => %{"id" => sender_psid}} = entry |> Map.get("messaging") |> Enum.at(0)
        case text do
          "subscribe me pls" ->
            RentBot.Subscribers.create_subscriber(%{psid: sender_psid})
            send_message(sender_psid, "You are now subscribed to my updates! :)")
          _other -> send_message(sender_psid, "new phone who dis?")
        end
    end)
    send_resp(conn, 200, "EVENT_RECEIVED")
  else
    send_resp(conn, 404, "NOT_FOUND")
  end
end
```

We just iterate over each entry in the entries list that is part of the request parameters. For each message we just check if the text is our super secret string that subscribes a user to our platform, and if it match we save the `sender_psid` that identifies this user. Other messages are ignored and receive a generic message as response.

So with the IDs of the users interested in the notifications, we go back to our `notify_subscribers` function that we saw in the import function.

```elixir
defp notify_subscribers(entries) do
  subscribers = RentBot.Subscribers.list_subscribers()
  
  Enum.each(entries, fn entry ->
    Enum.each(subscribers, fn x ->
      RentBotWeb.BotController.send_card(x.psid, entry)
    end)
  end)
end
```

Again, it is just simple iteration through the subscribers and for each one send a [card message](https://developers.facebook.com/docs/messenger-platform/reference/template/generic) with the given ad details.

And boom, you have a complete system working!

![](/images/64660d9ae20b8d7a.gif)

My daily batch of new apartments to rent

The next thing I did was to create a release using [Distillery](https://github.com/bitwalker/distillery), create a Docker image with my application and set it to run on an EC2 machine on AWS. All of this in the two hours after dinner on the day that I decided to try something new.

A few days passed and after several messages from our bot, we found an advertisement for an apartment that looked pretty good and I had all of the features that we wanted. The ad was posted just a few minutes ago and we decided to call. Because of our amazing tool we were the first ones to call, schedule a visit and rent the house.

And that is how you find a new place to live the smart way!

All the code I used is available in [GitHub](https://github.com/DFilipeS/rent-bot). Feel free to send me questions, issues or pull requests.
