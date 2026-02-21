1. Once we got business requirement divide it into two buckets -
- functional requirement & 
- non functional requirement (scalting, monitoring)

2. system architecture should be  more elaborative (high level building blocks this less details is fine)
- we should not only add services and db layer
- how services are being communicating
- what the DB for each services
- how eventing(Kafka) is happening

3. why mongodb not sql ?

4. why using multiple DB not single one ?

5. why not choosing postgressql for user service ?

6. how we have decided to use different different service ?

7. important to tell about which pattern is being used here (4 patterns are there)!

8. add web in client layer even we are not building the it, but from organization point of view

9. add check (lint/) before pushing to CI/CD pipleine

10. following branching starategy(pushing to main / develop - understand this) in github/github or just using CI/Cd

11. consider about different env (stage / dev/ prod)

12. Add sonar integration for quality checks

13. work on kubernetes and docker file

14. If we get the product to be build ? 
do we only build MVP things as considering the given time ?
or we will build the things which should be there 

*for that we need to clear the distinction between functional & non-functional requirement*
- using this we can easily detect what is out of scope and what is in scope

15. for NFRs
- Monitoring & Observability (prometheus, Grafana, Cloudwatch, Application Loggin, AA accessiblity Standards)
- Security & Performance (JWT Authetication, Input Validation, HTTPS)
- Caching & Data Optimization (Redis Caching, rate limiter)
- Scalability (load balancer (where it can be placed ? - for each service or API gateway service ?), limit auto scaling)
- Availabilty (99.9 % how to achive this ?)
- what are the pattern being used to ensure my services are not down and that should be automatic it should have manual effort ? (circuit breaker I know)

16. When to use rest and when to sue graphql ? and specifaclly about user/auth routes how it should be ?

17. vulenrabilty scan for code

18. how using llm model for AI chat ? directly SDK or using langchain ?

19. Secret keys -  how to handles API keys or tokens ?

20. logs in cloudwatch - how we are loggin data ?

21. how you are checking the helathyness of app ? best way to do that ? by exposing API ? how to let know which services are failing and how to let user know about it ?

22. Acceesibility, performance of api and mobile app, data optimization ? redis caching ?

23. CDN -what kind of cdn's are there and hoe can be implememeted in our app(akamai, cloudfare, before s3 we can use cloudfront)



deployment -docker Kubernetes, Jenkins
lets focus on making Jenkins pipeline working (use SonarQube, 
 
24. why implement PostgreSQL for auth
25. correlation Id full usage
26. logging monitoring - scope - give brief as I need to implement this 
27. what is GRPC and what is the scope in my project
28. how to handle single point of failure in api gateway ?
29. how to ensure application is scaling on which parameter ?
30. how it will scale ? horizonal or vertical ? when which will be done ?
31. deployment modular way (how to deploy single service at once)
32. how to handle autoscaling in Kubernetes
33. why keeping PostgreSQL for auth & mongodb for other ?
34. Automated testing for performance
35. Grafana implementation (any logging system which we can demo)
36. health check in services
37. Prometheus usage ?
38. what is bunching strategy ?
39. client scan stagey - for vulnerability (for packages & 40. docker images) for frontend & backend
40. for testing ? - unit testing or end to end testing ?
41. how to ensure quality of code ?
42. security implementation in frontend / backend / deployment
43. what is ECR and docker hub ?
44. why we are having rest API and not graphql and what which is better to use in api-gateway ?
45. CI/CD for react-native code