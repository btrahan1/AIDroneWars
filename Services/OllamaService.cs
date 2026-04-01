using System.Text.Json;
using System.Net.Http.Json;
using System.Text;
using System.Text.RegularExpressions;

namespace AIDroneWars.Services
{
    public class TacticalIntelligence
    {
        public string TargetId { get; set; } = "";
        public string ThreatLevel { get; set; } = "UNKNOWN"; // FRIEND, NEUTRAL, FOE
        public string Reasoning { get; set; } = "";
        public bool Engage { get; set; } = false;
        public string RawJson { get; set; } = "";
    }

    public class OllamaService
    {
        private readonly HttpClient _httpClient;
        private readonly string _modelName = "qwen3:8b";

        public OllamaService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri("http://localhost:11434");
        }

        public async Task<TacticalIntelligence> AnalyzeTargetAsync(string signatureJson)
        {
            var systemPrompt = """
                You are the AIDrone Tactical Intelligence Officer.
                Analyze sensor data from a drone and determine if a target is FRIEND, NEUTRAL, or a FOE.
                
                TREATY RULES:
                - If Heat is "HIGH" or "EXTREME" and Signal is "SCRAMBLED" -> Threat: FOE.
                - If Heat is "LOW" or "STABLE" and Signal is "STABLE" -> Threat: FRIEND.
                - Otherwise -> Threat: NEUTRAL.
                
                ENGAGEMENT PROTOCOL:
                - If Threat is "FOE", set Engage: true.
                - Otherwise, set Engage: false.
                
                OUTPUT FORMAT (MANDATORY JSON):
                { 
                  "targetId": "...", 
                  "threatLevel": "FRIEND | NEUTRAL | FOE", 
                  "reasoning": "Quick assessment", 
                  "engage": true | false 
                }
                """;

            var request = new
            {
                model = _modelName,
                prompt = $"{systemPrompt}\n\nSENSOR DATA: {signatureJson}\n\nResponse:",
                stream = false,
                format = "json",
                options = new {
                    temperature = 0.0,
                    top_k = 1
                }
            };

            var result = new TacticalIntelligence();
            try
            {
                var response = await _httpClient.PostAsJsonAsync("/api/generate", request);
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonResponse);
                result.RawJson = doc.RootElement.GetProperty("response").GetString()?.Trim() ?? "";

                var match = Regex.Match(result.RawJson, @"\{.*\}", RegexOptions.Singleline);
                var cleanJson = match.Success ? match.Value : result.RawJson;

                var parsed = JsonSerializer.Deserialize<TacticalIntelligence>(cleanJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (parsed != null)
                {
                    result.TargetId = parsed.TargetId;
                    result.ThreatLevel = parsed.ThreatLevel;
                    result.Reasoning = parsed.Reasoning;
                    result.Engage = parsed.Engage;
                }
            }
            catch (Exception ex)
            {
                result.Reasoning = "INTEL_FAILURE: " + ex.Message;
            }

            return result;
        }
    }
}
