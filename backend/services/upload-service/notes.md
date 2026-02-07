# Express	NestJS (in your project)

`
app.get('/transactions/summary', (req, res) => ...)	
@Controller('transactions') + @Get('summary') on a method
`

app.post('/auth/login', ...)	
@Controller('auth') + @Post('login')

req.body	
@Body() dto

req.query	
@Query() dto

req.params	
@Param('id') id

req (full request)	
@Req() req


Guard	
Before the route handler (e.g. “can this user access this route?”)	
JwtAuthGuard – checks JWT; routes are protected unless @Public().


Interceptor	
Around the handler (before and after; can change request/response)	
LoggingInterceptor, TransformInterceptor (e.g. wrap response in { data, meta }).

Filter	
When an exception is thrown (format error response)	HttpExceptionFilter – shapes error JSON (statusCode, message, correlationId).

So:
Guard ≈ “auth middleware” (allow/deny).
Interceptor ≈ “middleware” that wraps the handler (logging, response shape).
Filter ≈ “error-handling middleware” (how errors look in the response).
Your request flow (as in the doc): Request → Guards → Controller → Service → Interceptors → Response; if something throws → Filter.