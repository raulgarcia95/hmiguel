# La herencia del Tío Miguel

Aventura gráfica clásica adaptada a Canvas 2D, con ilustraciones HD, música, inventario, conversaciones y guardado local.

## Jugar

https://raulgarcia95.github.io/hmiguel/

Pulsa **Comenzar**. Clic para caminar o interactuar; **Mirar** para examinar; selecciona objetos del inventario para utilizarlos. Clic derecho cambia entre mirar y mano. **Esc** suelta el objeto. **Intro** continúa los textos. **Guardar / Cargar** conserva la partida en este navegador.

El juego llena la ventana sin deformar sus escenarios. **Pantalla completa** oculta la interfaz del navegador. La introducción da paso a la portada durante diez segundos, con fundidos. Las conversaciones se sobreimprimen sobre la ilustración.

## Estado y fidelidad

35 escenarios y 12 retratos HD, 33 máscaras originales conservadas y dos nuevas, diez secuencias y 16 músicas. Las animaciones se reconstruyen con fotogramas clave y capas; no son un redibujo individual idéntico de cada fotograma original. Los programas del televisor conservan sus imágenes originales.

El tramo final perdido se ha reconstruido con autorización del autor de esta adaptación: el detector recupera un ratón de cuerda en la arena; la tienda de recuerdos vende tinta invisible; la llave y el ratón resuelven la compuerta de Dragon Khan y enlazan con la historia de FINAL.FLI. Las escenas 24 y 36, sus objetos y este enlace son reconstrucciones, no guiones originales recuperados.

Una prueba automatizada recorre la partida desde el inicio hasta el final caminando por las máscaras reales, sin conceder objetos ni saltar habitaciones, incluyendo los diálogos y el guardado intermedio. Se verifican además 105 rutas, el reintento tras una muerte y la marcha a 30, 60 y 120 Hz. Esto no equivale a una partida manual en el navegador. Las animaciones HD usan fotogramas clave y capas, y no reproducen cada gesto del FLI de forma idéntica. Queda pendiente una revisión visual manual de la versión publicada.

Los ciclos de marcha tienen 24 poses alineadas por la pelvis y los pies; la fase depende de la distancia recorrida. El policía del final desciende por la cuerda con cuatro poses dibujadas. Tres conversaciones reconstruidas enlazan pistas de la tienda de recuerdos, la tienda de música y la tienda de deportes. Tras una muerte puedes volver a intentarlo desde antes de la última acción.

## Desarrollo

Sitio estático: servir esta carpeta con cualquier servidor HTTP. No requiere cuentas, servidor de datos ni dependencias externas. El guardado permanece en el navegador del jugador.
