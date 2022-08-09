---
title: "Creating an inline form on a table with Phoenix LiveView"
date: 2022-08-05T23:08:59+01:00
draft: false
---
# The problem

Recently I was working on a side project that helps me keep track of all my incomes and expenses. When I was looking at the list of movements, I felt the need to be able to quickly edit any entry or add new ones. 

The easiest way is to have some sort of button that either moves you to another page or open some modal with the form to create or edit the resource. I thought to myself that would be way cooler if I could do that directly in the same list of movements that I am already looking at.

# The solution

The idea is fairly straightforward: in the list of movements, when I click on a row, each field in that row should transform into an editable input. When I submit the form, the list entry returns to the previous state with the updated values. The final product should look like this:

![The final product](/posts/inline-forms-with-phoenix-live-view/final-product.gif#center)

All the code for this can be found in this [GitHub repository](https://github.com/DFilipeS/toggle-component-live-view-example).

# Step 0 - The Phoenix project and the necessary boilerplate

For our example, we will quickly go through the process of setting up an empty project with [Phoenix](https://www.phoenixframework.org/) and we will setup [Tailwind CSS](https://tailwindcss.com/) to help us make it look nicer.

We start by creating a new Phoenix project.

```bash
mix phx.new example
```

With the basic project created, we can generate a simple context for our movements. This Phoenix generator will create for us the Ecto schema and some utility functions.

```bash
mix phx.gen.context Accounting Movement movements date:date description:text amount:integer
```

Our movement schema has three fields: 
- A `date` when the movement happened;
- A `description` to give more context of what the purpose of the movement was;
- An `amount` associated with that movement (we could use the [`money`](https://hex.pm/packages/money) package to better handle this field but for demonstrations purposes having the `amount` as an integer is good enough).

We can then run the Ecto setup task that will drop the database (if one already exists), creates the database, runs the database migrations and runs the database seeds (that is our case just add some dummy data to our `movements` table).

```bash
mix ecto.reset
```

Finally, we setup Tailwind CSS so we can use some of its classes to quickly style our application. Tailwind CSS provides setup instructions specific for Phoenix, you can find it [here](https://tailwindcss.com/docs/guides/phoenix).

# Step 1 - The movements list table

We want a simple LiveView that displays a table. We will use some helper classes from Tailwind CSS to style our table.

```elixir
defmodule ExampleWeb.MovementsListLive do
  use ExampleWeb, :live_view

  alias Example.Accounting

  @impl Phoenix.LiveView
  def mount(_params, _session, socket) do
    socket = assign(socket, :movements, Accounting.list_movements())

    {:ok, socket}
  end

  @impl Phoenix.LiveView
  def render(assigns) do
    ~H"""
    <div class="table w-full text-xs my-4">
      <div class="table-header-group">
        <div class="table-row">
          <div class="table-cell py-2 border-b text-left font-bold w-32">Date</div>
          <div class="table-cell py-2 border-b text-left font-bold">Description</div>
          <div class="table-cell py-2 border-b text-left font-bold w-32">Amount</div>
        </div>
      </div>
      <div class="table-row-group">
        <%= for movement <- @movements do %>
          <div id={"movement-#{movement.id}"} class={"movement movement-#{movement.id} table-row cursor-pointer"}>
            <div class="table-cell py-2 border-y"><%= movement.date %></div>
            <div class="table-cell py-2 border-y"><%= movement.description %></div>
            <div class="table-cell py-2 border-y"><%= movement.amount %></div>
          </div>
        <% end %>
      </div>
    </div>
    """
  end
end
```

There is nothing special with this LiveView. In the `mount/3` function we setup the necessary data to render our page (in this case, a list of all movements in the database is assigned to the `socket`).

Then, on our `render/1` function we have the [HEEx](https://hexdocs.pm/phoenix_live_view/assigns-eex.html) template with our table. We have an header with the three fields or our movements (`date`, `description` and `amount`) and then we iterate over the `@movements` and we set the rows for those movements with the values of those three fields for each one.

With this, we have a functional page that displays the movements in a table. We just need to add the route to our `router.ex` and we should be able to access it through the browser.

```elixir
defmodule ExampleWeb.Router do
  use ExampleWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, {ExampleWeb.LayoutView, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end
  
  scope "/", ExampleWeb do
    pipe_through :browser

    live "/movements", MovementsListLive, :index
  end

  ...
end
```

Visiting the `/movements` page on your browser should display a list of movements.

![Movements list table](/posts/inline-forms-with-phoenix-live-view/movements-table.png#center)

# Step 2 - The movement form

We now want to have a form in the format of a table row that has three inputs, one for each field in own movement. The same form should handle the create and update scenarios for each movement. With that in mind, we can create a [LiveComponent](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveComponent.html) for our form with all the logic and markup necessary to render and operate it.

Lets try to look at it bit by bit and go over the detail in each block.

```elixir
defmodule ExampleWeb.MovementsList.FormComponent do
  use ExampleWeb, :live_component

  alias Example.Accounting
  alias Example.Accounting.Movement

  @impl Phoenix.LiveComponent
  def update(assigns, socket) do
    socket =
      socket
      |> assign(assigns)
      |> assign(:changeset, Accounting.change_movement(assigns.movement))

    {:ok, socket}
  end

  ...
end
```

First, we define our LiveComponent as `FormComponent` and we use the `update/2` function from the LiveComponent behavior to set some additional assigns. In this case, the only extra assign we want to add is the `changeset` for the form. Luckily, the Phoenix generator also creates some functions to easily get a changeset with the given `movement` and `params`. Since we expect this component to receive a `movement` from whenever it is used, we get that from the component `assigns` and use it to set the changeset. In the case of an update operation, we will get the movement we want to change. And in the case of a create operation, we will receive an empty `movement`. Both cases are covered!

Then, we will have two different events coming in: a `validate` event to (as the name implies) validate the form, and a `save` to either create or update the given `movement`.

```elixir
@impl Phoenix.LiveComponent
def handle_event("validate", %{"movement" => params}, socket) do
  changeset =
      socket.assigns.movement
      |> Accounting.change_movement(params)
      |> Map.put(:action, :validate)

  socket = assign(socket, :changeset, changeset)
  {:noreply, socket}
end
```

In the `handle_event/3` function for the `validate` event we just run the received `params` through the changeset again and assign the resulting changeset on the socket so that it can trigger a new render of the necessary elements on the page. Again, since we are using the `movement` we have on the socket assigns, both create and update operations are covered.

```elixir
@impl Phoenix.LiveComponent
def handle_event("save", %{"movement" => params}, socket) do
  case socket.assigns.movement do
    %Movement{id: nil} -> create_movement(socket, params)
    %Movement{} -> update_movement(socket, params)
  end
end

defp create_movement(socket, params) do
  case Accounting.create_movement(params) do
    {:ok, movement} ->
      socket = assign(socket, :changeset, Accounting.change_movement(%Movement{}))
      {:noreply, socket}

    {:error, changeset} ->
      socket = assign(socket, :changeset, changeset)
      {:noreply, socket}
  end
end

defp update_movement(socket, params) do
  case Accounting.update_movement(socket.assigns.movement, params) do
    {:ok, movement} ->
      {:noreply, socket}

    {:error, changeset} ->
      socket = assign(socket, :changeset, changeset)
      {:noreply, socket}
  end
end
```

In the `handle_event/3` function for the `save` event we start by looking at the `movement` we have on the socket assigns and decide if we need to create a new movement or update an existing one. Depending on the operation, we use the appropriate functions (also generated by the Phoenix code generator) to either create or update the movement. In case on an error (on any case), we will get a `changeset` that we can put back on the socket and the form should display any errors found. Another note to the success case of the create operation where we also reset the form so that a new movement can be immediately created after the form is submitted successfully.

```elixir
@impl Phoenix.LiveComponent
def render(assigns) do
  ~H"""
  <div class="contents">
    <.form let={f} for={@changeset} phx-target={@myself} phx-change="validate" phx-submit="save" as="movement" class="contents">
      <div class={"movement-form #{get_form_class(@movement)}"}>
        <div class="table-cell py-2 pr-1">
          <%= date_input f, :date, class: "rounded w-full text-xs mb-1" %>
          <%= error_tag f, :date, class: "text-xs text-red-500" %>
        </div>
        <div class="table-cell py-2 px-1">
          <%= text_input f, :description, class: "rounded w-full text-xs mb-1" %>
          <%= error_tag f, :description, class: "text-xs text-red-500" %>
        </div>
        <div class="table-cell py-2 pl-1">
          <%= number_input f, :amount, class: "rounded w-full text-xs mb-1" %>
          <%= error_tag f, :amount, class: "text-xs text-red-500" %>
        </div>
      </div>
      <div class={"movement-form #{get_form_class(@movement)}"}>
        <div class="table-cell pb-2 border-b"></div>
        <div class="table-cell pb-2 border-b"></div>
        <div class="table-cell pb-2 border-b text-right">
          <button type="submit" class="rounded px-2 py-1 bg-indigo-400 hover:bg-blue-600 text-white">Save</button>
        </div>
      </div>
    </.form>
  </div>
  """
end

defp get_form_class(%Movement{id: nil}), do: "create-movement-form"
defp get_form_class(%Movement{id: id}), do: "movement-#{id}-form"
```

And finally, we have the `render/1` function with the HEEx template of our form. In practice, there are two new table rows, one with the three different input fields and another one with the submit button. We also use a few Tailwind CSS classes to style the form to make it look nicer.

With that we have a functional form component that we can use on our movements list table.

# Step 3 - Adding the form to the movements list table

Back on our `MovementsListLive`, inside the `div` with the `table-row-group` class, we can now use our form component.

```elixir
@impl Phoenix.LiveView
def render(assigns) do
  ~H"""
  <div class="table w-full text-xs my-4">
    <div class="table-header-group">
      <div class="table-row">
        <div class="table-cell py-2 border-b text-left font-bold w-32">Date</div>
        <div class="table-cell py-2 border-b text-left font-bold">Description</div>
        <div class="table-cell py-2 border-b text-left font-bold w-32">Amount</div>
      </div>
    </div>
    <div class="table-row-group">
      <.live_component module={ExampleWeb.MovementsList.FormComponent}
                       id="create-movement-form"
                       movement={%Movement{}} />
      <%= for movement <- @movements do %>
        <div id={"movement-#{movement.id}"} class={"movement movement-#{movement.id} table-row cursor-pointer"}>
          <div class="table-cell py-2 border-y"><%= movement.date %></div>
          <div class="table-cell py-2 border-y"><%= movement.description %></div>
          <div class="table-cell py-2 border-y"><%= movement.amount %></div>
        </div>
        <.live_component module={ExampleWeb.MovementsList.FormComponent}
                         id={"movement-form-#{movement.id}"}
                         movement={movement} />
      <% end %>
    </div>
  </div>
  """
end
```

And just like that, we have functional forms for each entry on our movements list table! 

![Movements list forms](/posts/inline-forms-with-phoenix-live-view/forms.png#center)

You might notice that when you save any form, nothing seems to happen. That is because the form submit it being handled on the `FormComponent` and our movements list is being kept on the `MovementsListLive`. We need to somehow notify the parent LiveView that it needs to update its records. 

LiveComponents have their own state and life-cycle but they run on the parent LiveView process. This means that we can leverage the Elixir process messaging to notify the parent LiveView that it needs to refresh its state. To do that, we can add a `send/2` to the success cases of the create and update functions in the `FormComponent` to send a message to the process stating that that operation occurred.

```elixir
defp create_movement(socket, params) do
  case Accounting.create_movement(params) do
    {:ok, movement} ->
      socket = assign(socket, :changeset, Accounting.change_movement(%Movement{}))
      send(self(), {:movement_created, movement})
      {:noreply, socket}

    {:error, changeset} ->
      socket = assign(socket, :changeset, changeset)
      {:noreply, socket}
  end
end

defp update_movement(socket, params) do
  case Accounting.update_movement(socket.assigns.movement, params) do
    {:ok, movement} ->
      send(self(), {:movement_updated, movement})
      {:noreply, socket}

    {:error, changeset} ->
      socket = assign(socket, :changeset, changeset)
      {:noreply, socket}
  end
end
```

On the `MovementsListLive` we can now handle this incoming messages to update the movements list in the socket state.

```elixir
@impl Phoenix.LiveView
def handle_info({:movement_created, movement}, socket) do
  socket = assign(socket, :movements, Accounting.list_movements())

  {:noreply, socket}
end

@impl Phoenix.LiveView
def handle_info({:movement_updated, movement}, socket) do
  movements = 
    Enum.map(
      socket.assigns.movements, 
      &if(&1.id == movement.id, do: movement, else: &1)
    )

  socket = assign(socket, :movements, movements)

  {:noreply, socket}
end
```

Now if you try to submit any of the forms in the page, the changes are now done automatically after the successful form submit. We now have functional forms but the objective is to only show them if we click on a row in the movements list table. 

We could send events through the wire from the browser to server to control if a form show be shown or not and that would trigger a new render of the LiveView. But that seems overkill for just showing and hiding elements on the browser. Luckily, there is a better way!

# Step 4 - Showing and hiding elements with Phoenix.LiveView.JS

With the Phoenix.LiveView.JS utilities we can do some common client-side operations like adding and removing classes to elements, setting attributes, dispatch DOM events and even apply transitions to elements.

Lets start by making the form elements hidden by default with the help of the helper class `hidden` from Tailwind CSS. This class is just a shortcut to set the `display: none;` on the element.

```elixir
@impl Phoenix.LiveComponent
def render(assigns) do
  ~H"""
  <div class="contents">
    <.form let={f} for={@changeset} phx-target={@myself} phx-change="validate" phx-submit="save" as="movement" class="contents">
      <div class={"movement-form #{get_form_class(@movement)} hidden"}>
        ...
      </div>
      <div class={"movement-form #{get_form_class(@movement)} hidden"}>
        ...
      </div>
    </.form>
  </div>
  """
end
```

With our form elements hidden, we should just see the movements list table like we have in the beginning. Now we need to show the form when there is a click on a table row. In here, we set a few requirements:

- Only one form should be visible at a time;
    - If there is already a visible form, when clicking on another table row, we should hide the previous form;
    - Same thing applies if the create movement form is also visible;
- When displaying a form, we should automatically hide the movement table row that was clicked.

Having this in mind, we can use the Phoenix.LiveView.JS utilities to create a `show_form/2` function on the `MovementsListLive` that does exactly this.

```elixir
defp show_form(js \\ %JS{}, movement)

defp show_form(js, %Movement{id: nil}) do
  js
  |> JS.hide(to: ".movement-form")                  # Hide any visible form
  |> JS.show(to: ".movement", display: "table-row") # Display any previously hidden table row
  |> JS.show(                                       # Display create movement form
    to: ".create-movement-form",
    display: "table-row",
    transition: {"ease-in duration-150", "opacity-0", "opacity-100"},
    time: 150
  )
end

defp show_form(js, movement) do
  js
  |> JS.hide(to: ".movement-form")                  # Hide any visible form
  |> JS.show(to: ".movement", display: "table-row") # Display any previously hidden table row
  |> JS.hide(to: ".movement-#{movement.id}")        # Hide clicked table row
  |> JS.show(                                       # Display update movement form
    to: ".movement-#{movement.id}-form",
    display: "table-row",
    transition: {"ease-in duration-150", "opacity-0", "opacity-100"},
    time: 150
  )
end
```

Here we have a `show_form/2` and with it we can hide and show elements in the page thanks to the appropriate CSS classes. We even set some transitions to make it look a little bit nicer when the form element is getting shown on the page. Now we can use this function on our `render/1` to display the forms when clicked. To do that, we can add the function call to a `phx-click` binding on the element we want. Instead of passing a string with the event name on `phx-click` binding, instead we use a function call to our `show_form/2` function.

```elixir
@impl Phoenix.LiveView
def render(assigns) do
  ~H"""
  <div class="my-4">
    <button type="button"
            phx-click={show_form(%Movement{})}
            class="rounded px-3 py-2 bg-indigo-400 hover:bg-blue-600 text-white text-sm">
      Add new movement
    </button>
  </div>
  <div class="table w-full text-xs my-4">
    <div class="table-header-group">
      ...
    </div>
    <div class="table-row-group">
      <.live_component module={ExampleWeb.MovementsList.FormComponent}
                       id="create-movement-form"
                       movement={%Movement{}} />
      <%= for movement <- @movements do %>
        <div id={"movement-#{movement.id}"}
             class={"movement movement-#{movement.id} table-row cursor-pointer"}
             phx-click={show_form(movement)}>
          ...
        </div>
        <.live_component module={ExampleWeb.MovementsList.FormComponent}
                        id={"movement-form-#{movement.id}"}
                        movement={movement} />
      <% end %>
    </div>
  </div>
  """
end
```

If we look at what Phoenix generates in the HTML that gets sent to the browser, we see that the `phx-click` attribute has a list of all Phoenix.LiveView.JS actions that we defined.

```html
<div id="movement-11" class="movement movement-11 table-row cursor-pointer" phx-click="[[&quot;hide&quot;,{&quot;time&quot;:200,&quot;to&quot;:&quot;.movement-form&quot;,&quot;transition&quot;:[[],[],[]]}],[&quot;show&quot;,{&quot;display&quot;:&quot;table-row&quot;,&quot;time&quot;:200,&quot;to&quot;:&quot;.movement&quot;,&quot;transition&quot;:[[],[],[]]}],[&quot;hide&quot;,{&quot;time&quot;:200,&quot;to&quot;:&quot;.movement-11&quot;,&quot;transition&quot;:[[],[],[]]}],[&quot;show&quot;,{&quot;display&quot;:&quot;table-row&quot;,&quot;time&quot;:150,&quot;to&quot;:&quot;.movement-11-form&quot;,&quot;transition&quot;:[[&quot;ease-in&quot;,&quot;duration-150&quot;],[&quot;opacity-0&quot;],[&quot;opacity-100&quot;]]}]]" style="display: table-row;">
  <div class="table-cell py-2 border-y">2022-08-10</div>
  <div class="table-cell py-2 border-y">Test</div>
  <div class="table-cell py-2 border-y">1337</div>
</div>
```

```js
[["hide",{"time":200,"to":".movement-form","transition":[[],[],[]]}],["show",{"display":"table-row","time":200,"to":".movement","transition":[[],[],[]]}],["hide",{"time":200,"to":".movement-11","transition":[[],[],[]]}],["show",{"display":"table-row","time":150,"to":".movement-11-form","transition":[["ease-in","duration-150"],["opacity-0"],["opacity-100"]]}]]
```

The Phoenix JavaScript client that runs on the browser knows how to interpret this structure and apply all the necessary changes to the DOM without needing a new render on the server side. Pretty cool!

Now we already have a way of displaying the create and update forms but we should also have a way to dismiss them without submitting the form. We can do that with the same strategy we used to display the forms in the first place. Lets start by creating a `hide_form/2` function on the `MovementsListLive`.

```elixir
defp hide_form(js \\ %JS{}, movement)

defp hide_form(js, %Movement{id: nil}) do
  JS.hide(js, to: ".movement-form") # Hide all forms in the page
end

defp hide_form(js, movement) do
  js
  |> JS.hide(to: ".movement-form")  # Hide all forms in the page
  |> JS.show(                       # Display the previously hidden table row
    to: ".movement-#{movement.id}",
    display: "table-row",
    transition: {"ease-in duration-150", "opacity-0", "opacity-100"},
    time: 150
  )
end
```

Just like the function to display the form, the `hide_form/2` function is pretty simple and uses the utilities given by the Phoenix.LiveView.JS to manipulate the elements in the page.

We want our form to have a button to dismiss the form and return to the normal movement table row. On our `FormComponent`, we can add a "Cancel" button that calls an `on_cancel/0` function that we can provide to our component.

```elixir
@impl Phoenix.LiveComponent
def render(assigns) do
  ~H"""
  <div class="contents">
    <.form let={f} for={@changeset} phx-target={@myself} phx-change="validate" phx-submit="save" as="movement" class="contents">
      <div class={"movement-form #{get_form_class(@movement)} hidden"}>
        ...
      </div>
      <div class={"movement-form #{get_form_class(@movement)} hidden"}>
        <div class="table-cell pb-2 border-b"></div>
        <div class="table-cell pb-2 border-b"></div>
        <div class="table-cell pb-2 border-b text-right">
          <button type="button" phx-click={@on_cancel.()} class="px-2 py-1 mr-2">Cancel</button>
          <button type="submit" class="rounded px-2 py-1 bg-indigo-400 hover:bg-blue-600 text-white">Save</button>
        </div>
      </div>
    </.form>
  </div>
  """
end
```

The only thing left is to set the `on_cancel` property on the `FormComponent` call in the `MovementsListLive`.

```elixir
@impl Phoenix.LiveView
def render(assigns) do
  ~H"""
  <div class="my-4">
    ...
  </div>
  <div class="table w-full text-xs my-4">
    <div class="table-header-group">
      ...
    </div>
    <div class="table-row-group">
      <.live_component module={ExampleWeb.MovementsList.FormComponent}
                       id="create-movement-form"
                       movement={%Movement{}}
                       on_cancel={fn -> hide_form(%Movement{}) end} />
      <%= for movement <- @movements do %>
        <div id={"movement-#{movement.id}"}
             class={"movement movement-#{movement.id} table-row cursor-pointer"}
             phx-click={show_form(movement)}>
          ...
        </div>
        <.live_component module={ExampleWeb.MovementsList.FormComponent}
                        id={"movement-form-#{movement.id}"}
                        movement={movement}
                        on_cancel={fn -> hide_form(movement) end} />
      <% end %>
    </div>
  </div>
  """
end
```

And now we have a function "Cancel" button that dismisses the form correctly.

There is just one small detail left to complete our feature. When submitting the form, we should dismiss it as well. The question here is, how can we trigger our Phoenix.LiveView.JS changes from the server? 

In this [Fly.io blog post](https://fly.io/phoenix-files/server-triggered-js/) we are presented with a cool trick for this. Basically, we can push an event from the server to the client and in the client we can look at the event message, get some element from the DOM, look for a specific `data` attribute with our Phoenix.LiveView.JS changes and apply them.

Going back to our `render/1` function on the `MovementsListLive`, lets add the `data-hide-form` attribute with the Phoenix.LiveView.JS structure to hide a form.

```elixir
@impl Phoenix.LiveView
def render(assigns) do
  ~H"""
  <div class="my-4">
    ...
  </div>
  <div class="table w-full text-xs my-4">
    <div class="table-header-group">
      ...
    </div>
    <div class="table-row-group">
      ...
      <%= for movement <- @movements do %>
        <div id={"movement-#{movement.id}"}
             class={"movement movement-#{movement.id} table-row cursor-pointer"}
             phx-click={show_form(movement)}
             data-hide-form={hide_form(@movement)}>
          ...
        </div>
        ...
      <% end %>
    </div>
  </div>
  """
end
```

And in the `handle_info/2` functions for the notification messages from the form, lets push an event to the client to inform him of the change.

```elixir
@impl Phoenix.LiveView
def handle_info({:movement_created, movement}, socket) do
  socket =
    socket
    ...
    |> push_event("js-exec", %{
      to: ".movement-#{movement.id}",
      attr: "data-hide-form"
    })

  {:noreply, socket}
end

@impl Phoenix.LiveView
def handle_info({:movement_updated, movement}, socket) do
  ...

  socket =
    socket
    ...
    |> push_event("js-exec", %{
      to: ".movement-#{movement.id}",
      attr: "data-hide-form"
    })

  {:noreply, socket}
end
```

We are sending an event name `js-exec` with a payload that contains the element we want to target (that has the `data-hide-form` attribute) and the attribute name itself.

The final step is just add the listener for this event on the client script to handle the event and apply the Phoenix.LiveView.JS changes. On our `assets/js/app.js` we can add the following:

```js
window.addEventListener("phx:js-exec", ({ detail }) => {
    document.querySelectorAll(detail.to).forEach(el => {
        liveSocket.execJS(el, el.getAttribute(detail.attr))
    })
})
```

And that is it! Our forms should now be shown or hidden correctly the way that we wanted.

# Wrapping up

In a fairly simple use case we could see in action several parts of `Phoenix.LiveView` and how they interact. We could also experiment with `Phoenix.LiveView.JS` that can replace [Alpine.js](https://alpinejs.dev/) for client side interactions.