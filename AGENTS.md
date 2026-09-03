# Instrucciones globales del proyecto

## Reiniciar el servidor Node
NO usar cadenas de comandos encadenadas con `Stop-Process` + `Start-Process` + `Start-Sleep` + `Invoke-RestMethod` en una sola línea. Las 3 veces que se hizo hubo que cancelar por quedar en bucle esperando algo que nunca pasa.

En su lugar:
- Si el servidor ya corre en http://localhost:4892, NO lo reinicies: sus cambios estáticos (public/) se aplican con recargar el navegador (Ctrl+F5).
- Solo reinicia cuando cambie server.js (código del servidor). Hazlo con pasos separados y verificables, sin encadenar todo en un solo comando.
