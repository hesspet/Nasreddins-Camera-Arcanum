using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using MudBlazor.Services;
using Nasreddins_Camera_Arcanum;
using Nasreddins_Camera_Arcanum.Helpers;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddMudServices(config =>
{
    config.SnackbarConfiguration.MaxDisplayedSnackbars = 2;
    config.SnackbarConfiguration.PreventDuplicates = true;
});
builder.Services.AddScoped<DarkModeService>();
builder.Services.AddScoped<FotoStorage>();
builder.Services.AddScoped<SegmentationSettings>();
builder.Services.AddScoped<SegmentationService>();
builder.Services.AddScoped<ImageMergeService>();

await builder.Build().RunAsync();
