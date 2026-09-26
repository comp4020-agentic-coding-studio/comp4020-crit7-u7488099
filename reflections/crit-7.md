# Crit 7 reflection

**What was the breakthrough that moved the work forward?**

I think the biggest breakthrough was actually correcting what I was trying
to build before going too far with it. At first I was thinking about the
database in terms of enrolment, but then I realised that this was not
really what my app was doing. The purpose of the app is to help a student
plan what they might take in future semesters, not actually enrol them into
a course. Once I changed this to a study plan entry and connected it
properly to degree requirements using requirement_id, the later features
became much easier to build around it, such as recommendations, semester
planning and electives. Another thing I noticed near the end was when a
small styling change broke one of my earlier tests. My first thought was
that the test was being too strict because I had only changed the HTML
styling, but it made me realise that changing the implementation to keep an
existing test passing was safer than just changing the test whenever it
became inconvenient.

**What did this work change about who I want to be as a software developer?**

This crit made me realise that I get much better results from the coding
agent when I decide exactly what I want it to do before asking it to
implement everything. For most of this project I worked in small stages,
where I first decided what the data should represent and what the test
should prove, and then asked the agent to implement that part. This worked
much better than giving it a large feature and hoping it interpreted what I
wanted correctly. In future I want to spend more time deciding the data
model, scope and expected behaviour first, especially when using coding
agents, because it also makes it much easier for me to tell when the agent
is going in the wrong direction.
