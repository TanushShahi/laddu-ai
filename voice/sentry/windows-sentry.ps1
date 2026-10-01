# Windows Native Speech Recognition Sentry for LADDU
# Runs in low-power background mode, capturing microphone input and emitting JSON speech events.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Speech

try {
    $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
    $engine.SetInputToDefaultAudioDevice()

    # 1. Grammar Builder for Wake Phrases and Direct Commands
    $wakeChoices = New-Object System.Speech.Recognition.Choices
    $wakeChoices.Add(@(
        "Hey Laddu",
        "Laddu",
        "OK Laddu",
        "Hello Laddu",
        "Hey Jarvis",
        "Jarvis"
    ))

    # Common command choices for instant native recognition
    $commandChoices = New-Object System.Speech.Recognition.Choices
    $commandChoices.Add(@(
        "open chrome",
        "open vs code",
        "open code",
        "open notepad",
        "open calculator",
        "open explorer",
        "open terminal",
        "open hud",
        "show hud",
        "show laddu",
        "system status",
        "good morning",
        "good morning laddu",
        "check my posture",
        "wind down for tonight",
        "who are you",
        "stop listening"
    ))

    # 2. Build Choices Grammar
    $gb = New-Object System.Speech.Recognition.GrammarBuilder
    $gb.Append($wakeChoices)
    $grammarWake = New-Object System.Speech.Recognition.Grammar($gb)
    $grammarWake.Name = "WakeWordGrammar"
    $engine.LoadGrammar($grammarWake)

    # 3. Load Dictation Grammar for arbitrary natural speech
    $dictation = New-Object System.Speech.Recognition.DictationGrammar
    $dictation.Name = "DictationGrammar"
    $engine.LoadGrammar($dictation)

    Write-Host '{"type":"SENTRY_READY","status":"LISTENING"}'

    # Event handler for speech recognition
    Register-ObjectEvent -InputObject $engine -EventName "SpeechRecognized" -Action {
        $text = $Event.SourceEventArgs.Result.Text
        $confidence = [Math]::Round($Event.SourceEventArgs.Result.Confidence, 2)
        $durationMs = [Math]::Round($Event.SourceEventArgs.Result.Audio.Duration.TotalMilliseconds, 0)

        # Output JSON payload to stdout
        $payload = [PSCustomObject]@{
            type = "SPEECH_EVENT"
            text = $text
            confidence = $confidence
            durationMs = $durationMs
            timestamp = (Get-Date -Format "o")
        }
        $json = $payload | ConvertTo-Json -Compress
        [Console]::WriteLine($json)
    } | Out-Null

    # Start asynchronous continuous listening
    $engine.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)

    # Keep script alive until terminated
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
catch {
    $err = [PSCustomObject]@{
        type = "SENTRY_ERROR"
        error = $_.Exception.Message
    } | ConvertTo-Json -Compress
    [Console]::WriteLine($err)
    exit 1
}
finally {
    if ($engine) {
        $engine.RecognizeAsyncCancel()
        $engine.Dispose()
    }
}
