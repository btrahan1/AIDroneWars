using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using AIDroneWars.Data;
using AIDroneWars.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();
builder.Services.AddSingleton<WeatherForecastService>();

// DRILL: Added Tactical Intelligence Services
builder.Services.AddHttpClient<OllamaService>();
builder.Services.AddScoped<OllamaService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}

app.UseStaticFiles();

app.UseRouting();

app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

app.Run();
